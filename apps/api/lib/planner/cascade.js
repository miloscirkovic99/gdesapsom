/**
 * Provider cascade: Gemini → Cloudflare Workers AI → Anthropic (only while
 * today's spend is under the budget) → the plan without AI.
 *
 * A step is skipped or abandoned on a missing key, a transport error or
 * timeout, any non-200 status (429 included), an incomplete answer, invalid
 * JSON, or a plan validatePlan rejects (an unknown id among them). Tokens of
 * failed attempts are still paid for, so their cost counts toward the total
 * and toward the budget check of later steps.
 */
const { LIMITS } = require('./config');
const { costUsd, extractJson } = require('./providers');

/**
 * @param {{
 *   steps: { name: string, model: string, available: boolean, needsBudget?: boolean,
 *            request: () => object, parse: (body: string) => { text: string, tokensIn: number, tokensOut: number } }[],
 *   send: (request: object, timeoutMs: number) => { status: number, body: string },
 *   validate: (plan: unknown) => { ok: boolean, plan?: object, errors?: string[] },
 *   fallback: () => object,
 *   spentTodayUsd: number,
 *   budgetUsd: number,
 *   timeoutMs?: number,
 * }} options
 */
function runCascade(options) {
  const timeoutMs = options.timeoutMs || LIMITS.providerTimeoutMs;
  const attempts = [];
  let spent = 0;
  let tokensIn = 0;
  let tokensOut = 0;

  for (const step of options.steps) {
    if (!step.available) {
      attempts.push({ provider: step.name, outcome: 'unavailable' });
      continue;
    }
    if (step.needsBudget && options.spentTodayUsd + spent >= options.budgetUsd) {
      attempts.push({ provider: step.name, outcome: 'budget' });
      continue;
    }

    let parsed = null;
    try {
      const response = options.send(step.request(), timeoutMs);
      if (response.status !== 200) {
        attempts.push({ provider: step.name, outcome: response.status === 429 ? 'rate_limited' : 'http_error', status: response.status });
        continue;
      }
      parsed = step.parse(response.body);
      const plan = extractJson(parsed.text);
      const checked = options.validate(plan);
      const cost = costUsd(step.name, parsed.tokensIn, parsed.tokensOut);
      spent += cost;
      tokensIn += parsed.tokensIn;
      tokensOut += parsed.tokensOut;

      if (!checked.ok) {
        attempts.push({ provider: step.name, outcome: 'invalid', errors: (checked.errors || []).slice(0, 10), costUsd: cost });
        continue;
      }
      attempts.push({ provider: step.name, outcome: 'ok', costUsd: cost });
      return {
        source: 'ai',
        provider: step.name,
        model: step.model,
        plan: checked.plan,
        tokensIn,
        tokensOut,
        costUsd: round6(spent),
        attempts,
      };
    } catch (error) {
      // A reply that was read but unusable was still billed.
      const used = parsed || (error && Number.isFinite(error.tokensIn) ? error : null);
      if (used) {
        const cost = costUsd(step.name, used.tokensIn, used.tokensOut);
        spent += cost;
        tokensIn += used.tokensIn;
        tokensOut += used.tokensOut;
      }
      attempts.push({ provider: step.name, outcome: (error && error.kind) || 'error', message: String((error && error.message) || error).slice(0, 200) });
    }
  }

  return {
    source: 'rules',
    provider: 'rules',
    model: null,
    plan: options.fallback(),
    tokensIn,
    tokensOut,
    costUsd: round6(spent),
    attempts,
  };
}

const round6 = (value) => Math.round(value * 1e6) / 1e6;

module.exports = { runCascade };
