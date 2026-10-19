/**
 * Pure helpers of the model eval (run-eval.mjs, build-scenarios.mjs), kept
 * apart so they can be tested without network or keys: `node --test eval/`.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PRICES_PER_MTOK, MAX_OUTPUT_TOKENS, WEATHER } = require('../apps/api/lib/planner/config.js');
const { parseHours } = require('../apps/api/lib/planner/hours.js');
const { extractJson } = require('../apps/api/lib/planner/providers.js');
const { validatePlan } = require('../apps/api/lib/planner/validate.js');
const { PLAN_SCHEMAS } = require('../apps/api/lib/planner/prompt.js');

export const PROVIDERS = ['gemini', 'cloudflare', 'anthropic'];
/** Spending cap for one full eval run, USD. */
export const COST_LIMIT_USD = 0.1;
/** Expected reply length used for the estimate; a plan is a few hundred tokens of JSON. */
export const EXPECTED_OUTPUT_TOKENS = 1000;

/** The daytime summary the planner would have computed, from a scenario's fixed numbers. */
export function scenarioWeather(spec) {
  const { tMin, tMax } = spec;
  return {
    date: spec.date ?? null,
    tMin,
    tMax,
    tAvg: Math.round(((tMin + tMax) / 2) * 10) / 10,
    precipitationMm: spec.precipitationMm ?? 0,
    rainy: !!spec.rainy,
    cold: tMax <= WEATHER.coldMaxC,
    hot: tMax > WEATHER.hotC,
    symbols: [],
  };
}

/** Candidates as exported (raw `radno_vreme` JSON) → as the planner uses them. */
export function hydrateCandidates(candidates) {
  return candidates.map((candidate) => ({ ...candidate, radno_vreme: parseHours(candidate.radno_vreme) }));
}

/**
 * Tokens of a prompt, overestimated on purpose: about 3 characters per token
 * (Serbian with diacritics tokenizes worse than English's ~4).
 */
export function approxTokens(text) {
  return Math.ceil(text.length / 3);
}

/**
 * USD for the whole run, expected and worst case (every reply hitting
 * MAX_OUTPUT_TOKENS). Paid prices are used for Gemini too, although its free
 * tier would make it zero.
 */
export function estimateCost(promptTokensPerScenario, providers = PROVIDERS) {
  let expected = 0;
  let worst = 0;
  for (const provider of providers) {
    const price = PRICES_PER_MTOK[provider];
    for (const tokensIn of promptTokensPerScenario) {
      expected += (tokensIn * price.input + EXPECTED_OUTPUT_TOKENS * price.output) / 1e6;
      worst += (tokensIn * price.input + MAX_OUTPUT_TOKENS * price.output) / 1e6;
    }
  }
  return { expected: round6(expected), worst: round6(worst) };
}

/** Nearest-rank 95th percentile; null for no values. */
export function p95(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  return sorted[Math.ceil(0.95 * sorted.length) - 1];
}

/** Every lokacija_id / veterinar_id a reply mentions, whatever its shape. */
export function mentionedIds(plan) {
  const ids = [];
  const visit = (node) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'lokacija_id' || key === 'veterinar_id') && value !== null) ids.push(Number(value));
      else visit(value);
    }
  };
  visit(plan);
  return ids;
}

/**
 * Scores one model reply.
 *  - validJson: the reply parses and has every top-level field of its schema;
 *  - inventedIds: ids that are not among the scenario's candidates;
 *  - rulesOk: validatePlan accepts it (ids, rising times, stops a day, heat, hours).
 */
export function scoreReply(text, scenario) {
  let plan;
  try {
    plan = extractJson(text);
  } catch {
    return { validJson: false, inventedIds: [], rulesOk: false, errors: ['bad_json'] };
  }
  const required = PLAN_SCHEMAS[scenario.params.mode].required;
  const validJson = !!plan && typeof plan === 'object' && !Array.isArray(plan) && required.every((key) => key in plan);

  const known = new Set(scenario.candidates.map((candidate) => Number(candidate.id)));
  const inventedIds = mentionedIds(plan).filter((id) => !known.has(id));

  const checked = validatePlan(plan, {
    params: scenario.params,
    candidates: scenario.candidates,
    weather: scenario.weather,
    date: scenario.params.mode === 'dan' ? scenario.params.datum : null,
  });
  return { validJson, inventedIds, rulesOk: validJson && checked.ok, errors: checked.ok ? [] : checked.errors };
}

/** Per-model summary rows for the results table. */
export function summarize(results, providers = PROVIDERS) {
  return providers.map((provider) => {
    const rows = results.filter((row) => row.provider === provider);
    return {
      provider,
      total: rows.length,
      validJson: rows.filter((row) => row.score && row.score.validJson).length,
      withInventedIds: rows.filter((row) => row.score && row.score.inventedIds.length > 0).length,
      inventedIdsTotal: rows.reduce((sum, row) => sum + (row.score ? row.score.inventedIds.length : 0), 0),
      rulesOk: rows.filter((row) => row.score && row.score.rulesOk).length,
      p95Ms: p95(rows.map((row) => row.latencyMs)),
      costUsd: round6(rows.reduce((sum, row) => sum + (row.costUsd || 0), 0)),
      failures: rows.filter((row) => !row.score).length,
    };
  });
}

/** The table the task asks for; "Srpski" is filled in by hand after reading eval/outputs/. */
export function renderTable(summary, models) {
  const lines = [
    '| Model | Validan JSON (od 20) | Izmišljeni id | Poštuje pravila za psa | Srpski (1–5) | p95 vreme |',
    '|---|---|---|---|---|---|',
  ];
  for (const row of summary) {
    const p = row.p95Ms === null ? '—' : `${(row.p95Ms / 1000).toFixed(1).replace('.', ',')} s`;
    lines.push(
      `| ${models[row.provider]} | ${row.validJson}/${row.total} | ${row.withInventedIds} odgovora (${row.inventedIdsTotal} id) | ${row.rulesOk}/${row.total} |  | ${p} |`,
    );
  }
  return lines.join('\n');
}

const round6 = (value) => Math.round(value * 1e6) / 1e6;
