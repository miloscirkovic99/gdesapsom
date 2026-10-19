#!/usr/bin/env node
/**
 * Builds eval/scenarios.json: the 20 scenarios of scenario-specs.json, each
 * with the candidates the planner would send for it, chosen from a database
 * export by the planner's own selection (selectCandidates).
 *
 *   node eval/build-scenarios.mjs --candidates path\to\candidates-export.json [--out eval\scenarios.json]
 *
 * The export has one list of candidates per city and destination, in the
 * planner's candidate shape with `radno_vreme` as stored:
 *   { "generatedAt": "2026-11-20", "areas": { "beograd": [...], "novi-sad": [...], "kopaonik": [...], ... } }
 * It comes from the database, so the scenarios use real places only.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hydrateCandidates, scenarioWeather } from './eval-lib.mjs';

const require = createRequire(import.meta.url);
const { selectCandidates } = require('../apps/api/lib/planner/candidates.js');
const { rulesPlan } = require('../apps/api/lib/planner/rules-plan.js');
const { validatePlan } = require('../apps/api/lib/planner/validate.js');
const { CITIES, DESTINATIONS } = require('../apps/api/lib/planner/config.js');

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const exportPath = args[args.indexOf('--candidates') + 1];
if (!args.includes('--candidates') || !exportPath) {
  console.error('Usage: node eval/build-scenarios.mjs --candidates <candidates-export.json>');
  process.exit(1);
}

const outPath = args.includes('--out') ? args[args.indexOf('--out') + 1] : join(HERE, 'scenarios.json');
const exported = JSON.parse(readFileSync(exportPath, 'utf8'));
const specs = JSON.parse(readFileSync(join(HERE, 'scenario-specs.json'), 'utf8')).scenarios;

const thin = [];
const scenarios = specs.map((spec) => {
  const pool = exported.areas?.[spec.area];
  if (!Array.isArray(pool) || pool.length === 0) throw new Error(`The export has no candidates for "${spec.area}"`);

  const weather = scenarioWeather(spec.weather);
  const center = spec.params.mode === 'dan' ? CITIES[spec.area] : DESTINATIONS[spec.area];
  const context = {
    params: spec.params,
    weather,
    date: spec.params.mode === 'dan' ? spec.params.datum : null,
    today: exported.generatedAt,
    center,
  };
  const chosen = selectCandidates(hydrateCandidates(pool), context);
  const ids = new Set(chosen.map((candidate) => candidate.id));

  console.log(`${spec.id}: ${chosen.length} candidates (${spec.area})`);
  // The planner calls no model when even its rules plan cannot be made
  // (503 "no_places"), so such a scenario would measure nothing.
  if (!validatePlan(rulesPlan(chosen, context), { ...context, candidates: chosen }).ok) thin.push(`${spec.id} (${spec.area})`);
  // Stored as exported, so the file reads like the database.
  return { id: spec.id, params: spec.params, weather, candidates: pool.filter((candidate) => ids.has(candidate.id)) };
});

if (thin.length) {
  console.error(`Too few places for a plan in: ${thin.join(', ')}. Add places to the database (or fix the export) first; nothing written.`);
  process.exit(1);
}

writeFileSync(
  outPath,
  `${JSON.stringify({ generatedAt: exported.generatedAt, source: exportPath.replace(/^.*[\\/]/, ''), scenarios }, null, 2)}\n`,
);
console.log(`Wrote ${outPath} with ${scenarios.length} scenarios.`);
