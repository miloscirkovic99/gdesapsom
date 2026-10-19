#!/usr/bin/env node
/**
 * Sends every scenario of eval/scenarios.json straight to the three models
 * (no quota, no cache, no fallback) and writes eval/results-<date>.md, with
 * the raw replies in eval/outputs/<date>/<provider>/<scenario>.json.
 *
 * PowerShell:
 *   $env:GEMINI_API_KEY = "..."; $env:CF_ACCOUNT_ID = "..."; $env:CF_AI_API_TOKEN = "..."; $env:ANTHROPIC_API_KEY = "..."
 *   node eval/run-eval.mjs --dry-run     # cost estimate only, no calls
 *   node eval/run-eval.mjs               # estimate, then the run (refused at 0.10 USD or more)
 *
 * Options: --providers gemini,cloudflare,anthropic   --timeout 30000 (ms per call)   --scenarios <file>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  approxTokens,
  COST_LIMIT_USD,
  estimateCost,
  hydrateCandidates,
  PROVIDERS,
  renderTable,
  scoreReply,
  summarize,
} from './eval-lib.mjs';

const require = createRequire(import.meta.url);
const providers = require('../apps/api/lib/planner/providers.js');
const { MODELS } = require('../apps/api/lib/planner/config.js');
const { buildUserMessage, PLAN_SCHEMAS } = require('../apps/api/lib/planner/prompt.js');

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const DRY_RUN = args.includes('--dry-run');
const TIMEOUT_MS = Number(option('--timeout', '30000'));
const chosen = option('--providers', PROVIDERS.join(',')).split(',').filter((name) => PROVIDERS.includes(name));

const system = readFileSync(join(HERE, '../docs/planer-sistemski-prompt.md'), 'utf8');
const scenariosPath = option('--scenarios', join(HERE, 'scenarios.json'));
if (!existsSync(scenariosPath)) {
  console.error(`${scenariosPath} does not exist. Build it first from the database:
  1. GET api/v2/planner/candidates-export as admin, save the answer as candidates-export.json
  2. node eval/build-scenarios.mjs --candidates candidates-export.json`);
  process.exit(1);
}
const file = JSON.parse(readFileSync(scenariosPath, 'utf8'));
const scenarios = file.scenarios.map((scenario) => ({ ...scenario, candidates: hydrateCandidates(scenario.candidates) }));

const prompts = scenarios.map((scenario) =>
  buildUserMessage({
    params: scenario.params,
    weather: scenario.weather,
    candidates: scenario.candidates,
    date: scenario.params.mode === 'dan' ? scenario.params.datum : null,
  }),
);

// ── Cost first ───────────────────────────────────────────────────────────────
const promptTokens = prompts.map((user) => approxTokens(system) + approxTokens(user));
const estimate = estimateCost(promptTokens, chosen);
console.log(`${scenarios.length} scenarios × ${chosen.length} models`);
console.log(`Estimated cost: ${estimate.expected.toFixed(4)} USD (worst case, every reply at the token cap: ${estimate.worst.toFixed(4)} USD)`);
if (estimate.expected >= COST_LIMIT_USD) {
  console.error(`Refusing to run: the estimate is not under ${COST_LIMIT_USD} USD.`);
  process.exit(2);
}
if (DRY_RUN) process.exit(0);

// ── Calls ────────────────────────────────────────────────────────────────────
const env = process.env;
const STEPS = {
  gemini: {
    available: !!env.GEMINI_API_KEY,
    request: (user, schema) => providers.geminiRequest({ apiKey: env.GEMINI_API_KEY, model: MODELS.gemini, system, user, schema }),
    parse: providers.parseGemini,
  },
  cloudflare: {
    available: !!(env.CF_ACCOUNT_ID && env.CF_AI_API_TOKEN),
    request: (user, schema) =>
      providers.cloudflareRequest({ accountId: env.CF_ACCOUNT_ID, token: env.CF_AI_API_TOKEN, model: MODELS.cloudflare, system, user, schema }),
    parse: providers.parseCloudflare,
  },
  anthropic: {
    available: !!env.ANTHROPIC_API_KEY,
    request: (user, schema) => providers.anthropicRequest({ apiKey: env.ANTHROPIC_API_KEY, model: MODELS.anthropic, system, user, schema }),
    parse: providers.parseAnthropic,
  },
};

for (const name of chosen) {
  if (!STEPS[name].available) {
    console.error(`Missing API key for ${name}; set its environment variables or leave it out with --providers.`);
    process.exit(1);
  }
}

const today = new Date().toISOString().slice(0, 10);
const outDir = join(HERE, 'outputs', today);
const results = [];

for (const provider of chosen) {
  mkdirSync(join(outDir, provider), { recursive: true });
  for (const [index, scenario] of scenarios.entries()) {
    const request = STEPS[provider].request(prompts[index], PLAN_SCHEMAS[scenario.params.mode]);
    const started = performance.now();
    let status = null;
    let body = null;
    let error = null;
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      status = response.status;
      body = await response.text();
    } catch (failure) {
      error = String(failure && failure.message ? failure.message : failure);
    }
    const latencyMs = Math.round(performance.now() - started);

    let parsed = null;
    let score = null;
    let costUsd = 0;
    if (status === 200) {
      try {
        parsed = STEPS[provider].parse(body);
      } catch (failure) {
        error = String(failure.message);
        if (Number.isFinite(failure.tokensIn)) parsed = { text: '', tokensIn: failure.tokensIn, tokensOut: failure.tokensOut };
      }
      if (parsed) {
        costUsd = providers.costUsd(provider, parsed.tokensIn, parsed.tokensOut);
        score = scoreReply(parsed.text, scenario);
      }
    } else if (status !== null) {
      error = `HTTP ${status}`;
    }

    // Raw reply as received, never the request (it carries the key in a header only, but nothing is gained by keeping it).
    writeFileSync(
      join(outDir, provider, `${scenario.id}.json`),
      `${JSON.stringify({ scenario: scenario.id, provider, model: MODELS[provider], status, latencyMs, error, costUsd, score, body }, null, 2)}\n`,
    );
    results.push({ provider, scenario: scenario.id, latencyMs, costUsd, score });
    console.log(`${provider} ${scenario.id}: ${status ?? 'error'} ${latencyMs} ms${score ? ` json=${score.validJson} rules=${score.rulesOk} invented=${score.inventedIds.length}` : ` ${error}`}`);
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
const summary = summarize(results, chosen);
const spent = summary.reduce((sum, row) => sum + row.costUsd, 0);
const report = [
  `# Eval planera — ${today}`,
  '',
  `Scenarija: ${scenarios.length} (${file.source ?? 'scenarios.json'}, kandidati iz baze od ${file.generatedAt ?? '?'}). Pozivi direktno ka modelima, bez kvote i keša, timeout ${TIMEOUT_MS / 1000} s.`,
  '',
  renderTable(summary, MODELS),
  '',
  '- **Validan JSON**: odgovor se parsira i ima sva polja šeme.',
  '- **Izmišljeni id**: broj odgovora sa bar jednim id-jem koji nije među kandidatima (u zagradi ukupno takvih id-jeva).',
  '- **Poštuje pravila za psa**: plan prolazi validaciju planera (id-jevi, vremena rastu, najviše 5 stanica dnevno, bez šetnje 11–17 h iznad 28 °C, radno vreme).',
  '- **Srpski**: ocena 1–5 posle čitanja odgovora u `eval/outputs/' + today + '/`; popunjava se ručno.',
  '',
  `Procena pre pokretanja: ${estimate.expected.toFixed(4)} USD. Stvarni trošak po usage poljima: ${spent.toFixed(4)} USD.`,
  '',
  '| Model | Neuspelih poziva | Trošak (USD) |',
  '|---|---|---|',
  ...summary.map((row) => `| ${MODELS[row.provider]} | ${row.failures} | ${row.costUsd.toFixed(4)} |`),
  '',
].join('\n');

writeFileSync(join(HERE, `results-${today}.md`), report);
console.log(`\nWrote eval/results-${today}.md (spent ${spent.toFixed(4)} USD)`);
