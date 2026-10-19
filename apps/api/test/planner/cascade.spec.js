const { runCascade } = require('../../lib/planner/cascade');
const { ProviderError } = require('../../lib/planner/providers');

const okPlan = { naslov: 'Plan', stanice: [{ vreme: '09:00', lokacija_id: 1 }] };
const validate = (plan) => (plan.stanice && plan.stanice.every((s) => s.lokacija_id === 1) ? { ok: true, plan } : { ok: false, errors: ['lokacija_id:unknown'] });
const fallback = () => ({ naslov: 'Bez AI', stanice: [] });

/** A mock provider: `reply` is what its HTTP call returns or throws. */
function step(name, reply, extra = {}) {
  return {
    name,
    model: `${name}-model`,
    available: true,
    request: () => ({ url: name }),
    parse: (body) => ({ text: body, tokensIn: 1000, tokensOut: 500 }),
    ...extra,
    reply,
  };
}

function run(steps, overrides = {}) {
  const calls = [];
  const send = (request, timeoutMs) => {
    calls.push({ provider: request.url, timeoutMs });
    const reply = steps.find((s) => s.name === request.url).reply;
    if (reply instanceof Error) throw reply;
    return reply;
  };
  const result = runCascade({ steps, send, validate, fallback, spentTodayUsd: 0, budgetUsd: 0.3, ...overrides });
  return { result, calls };
}

const ok = (plan = okPlan) => ({ status: 200, body: JSON.stringify(plan) });

describe('provider cascade', () => {
  it('uses the first provider that answers with a valid plan, with a 10 s timeout', () => {
    const { result, calls } = run([step('gemini', ok()), step('cloudflare', ok()), step('anthropic', ok(), { needsBudget: true })]);
    expect(result).toMatchObject({ source: 'ai', provider: 'gemini', model: 'gemini-model', plan: okPlan });
    expect(calls).toEqual([{ provider: 'gemini', timeoutMs: 10000 }]);
    // 1000 in × $0.25/M + 500 out × $1.50/M
    expect(result.costUsd).toBeCloseTo(0.001, 6);
  });

  it('moves on after a 429, an error status, a timeout, bad JSON and an unknown id', () => {
    const steps = [
      step('gemini', { status: 429, body: '' }),
      step('cloudflare', { status: 200, body: 'not json' }),
      step('anthropic', ok({ ...okPlan, stanice: [{ vreme: '09:00', lokacija_id: 42 }] }), { needsBudget: true }),
    ];
    const { result } = run(steps);
    expect(result.source).toBe('rules');
    expect(result.plan).toEqual(fallback());
    expect(result.attempts.map((a) => a.outcome)).toEqual(['rate_limited', 'bad_json', 'invalid']);
    // Cloudflare and Anthropic answered and are paid for; Gemini's 429 is not.
    expect(result.costUsd).toBeCloseTo((1000 * 0.1 + 500 * 0.3) / 1e6 + (1000 * 0.1 + 500 * 0.5) / 1e6, 6);

    const timeout = run([step('gemini', new Error('timeout')), step('cloudflare', { status: 503, body: '' }), step('anthropic', ok(), { needsBudget: true })]);
    expect(timeout.result).toMatchObject({ source: 'ai', provider: 'anthropic' });
    expect(timeout.result.attempts.map((a) => a.outcome)).toEqual(['error', 'http_error', 'ok']);
  });

  it('counts the tokens of an answer that stopped early', () => {
    const truncated = step('gemini', ok(), {
      parse: () => {
        throw Object.assign(new ProviderError('incomplete', 'MAX_TOKENS'), { tokensIn: 2000, tokensOut: 2048 });
      },
    });
    const { result } = run([truncated, step('cloudflare', ok())]);
    expect(result.provider).toBe('cloudflare');
    expect(result.tokensIn).toBe(3000);
  });

  it('skips a provider whose key is missing', () => {
    const { result, calls } = run([step('gemini', ok(), { available: false }), step('cloudflare', ok())]);
    expect(result.provider).toBe('cloudflare');
    expect(calls.map((c) => c.provider)).toEqual(['cloudflare']);
  });
});

describe('daily budget', () => {
  const steps = () => [step('gemini', { status: 429, body: '' }), step('cloudflare', { status: 429, body: '' }), step('anthropic', ok(), { needsBudget: true })];

  it('calls the paid model while today is under the budget', () => {
    expect(run(steps(), { spentTodayUsd: 0.2999 }).result.provider).toBe('anthropic');
  });

  it('skips it once today reached the budget, and falls back to the plan without AI', () => {
    const { result, calls } = run(steps(), { spentTodayUsd: 0.3 });
    expect(result.source).toBe('rules');
    expect(calls.map((c) => c.provider)).toEqual(['gemini', 'cloudflare']);
    expect(result.attempts[2]).toEqual({ provider: 'anthropic', outcome: 'budget' });
  });

  it('includes what this request already spent', () => {
    const paidFailure = step('cloudflare', { status: 200, body: 'garbage' }, { parse: () => ({ text: 'garbage', tokensIn: 1e6, tokensOut: 0 }) });
    const { result } = run([paidFailure, step('anthropic', ok(), { needsBudget: true })], { spentTodayUsd: 0.25 });
    // 0.25 + 0.10 already spent by Cloudflare ≥ 0.30
    expect(result.attempts.map((a) => a.outcome)).toEqual(['bad_json', 'budget']);
  });

  it('a zero budget never calls it', () => {
    expect(run(steps(), { budgetUsd: 0 }).result.source).toBe('rules');
  });
});
