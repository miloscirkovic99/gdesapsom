// node --test eval/eval.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { estimateCost, mentionedIds, p95, renderTable, scenarioWeather, scoreReply, summarize } from './eval-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const candidate = (id, kategorija) => ({ id, naziv: `M${id}`, kategorija, kvart: null, lat: 44.8, lng: 20.4, psi_unutra: true, psi_basta: null, max_velicina: 'svi', radno_vreme: null, kratak_opis: null, premium: false });
const scenario = {
  id: 'dan-x',
  params: { mode: 'dan', grad: 'beograd', datum: '2026-11-21', velicina: 'srednji' },
  weather: scenarioWeather({ date: '2026-11-21', tMin: 5, tMax: 12 }),
  candidates: [candidate(1, 'park'), candidate(2, 'kafic'), candidate(3, 'restoran')],
};
const stop = (vreme, id) => ({ vreme, lokacija_id: id, zasto: 'z', savet_za_psa: 's' });

test('scores a valid plan, an invented id and broken JSON', () => {
  const good = JSON.stringify({ naslov: 'N', stanice: [stop('09:00', 1), stop('10:30', 2), stop('13:00', 3)], napomene: [] });
  assert.deepEqual(scoreReply(good, scenario), { validJson: true, inventedIds: [], rulesOk: true, errors: [] });

  const invented = JSON.stringify({ naslov: 'N', stanice: [stop('09:00', 1), stop('10:30', 99), stop('13:00', 3)], napomene: [] });
  const scored = scoreReply(invented, scenario);
  assert.equal(scored.validJson, true);
  assert.deepEqual(scored.inventedIds, [99]);
  assert.equal(scored.rulesOk, false);

  assert.equal(scoreReply('Evo plana', scenario).validJson, false);
  assert.equal(scoreReply('{"stanice": []}', scenario).validJson, false);
});

test('finds ids anywhere in a winter plan', () => {
  assert.deepEqual(mentionedIds({ smestaj: [{ lokacija_id: 5 }], dani: [{ stanice: [{ lokacija_id: 6 }] }], veterinar_id: 7 }), [5, 6, 7]);
  assert.deepEqual(mentionedIds({ veterinar_id: null }), []);
});

test('p95 is nearest-rank', () => {
  assert.equal(p95([]), null);
  assert.equal(p95([5]), 5);
  assert.equal(p95(Array.from({ length: 20 }, (_, i) => i + 1)), 19);
});

test('estimates cost from token counts at paid prices', () => {
  const { expected, worst } = estimateCost([3000, 3000], ['anthropic']);
  assert.equal(expected, (2 * (3000 * 0.1 + 1000 * 0.5)) / 1e6);
  assert.ok(worst > expected);
});

test('renders the required table columns', () => {
  const summary = summarize([{ provider: 'gemini', latencyMs: 1200, costUsd: 0.001, score: { validJson: true, inventedIds: [], rulesOk: true } }], ['gemini']);
  const table = renderTable(summary, { gemini: 'gemini-3.1-flash-lite' });
  assert.match(table, /^\| Model \| Validan JSON \(od 20\) \| Izmišljeni id \| Poštuje pravila za psa \| Srpski \(1–5\) \| p95 vreme \|/);
  assert.match(table, /\| gemini-3.1-flash-lite \| 1\/1 \| 0 odgovora \(0 id\) \| 1\/1 \| {2}\| 1,2 s \|/);
});

test('build-scenarios refuses an export too thin for the planner to make a plan', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gsp-eval-'));
  const exportPath = join(dir, 'candidates-export.json');
  const areas = { beograd: [], 'novi-sad': [], kopaonik: [], zlatibor: [], tara: [] };
  areas.beograd.push({ id: 11, naziv: 'Kafić', kategorija: 'kafic', kvart: null, lat: 44.82, lng: 20.46, psi_unutra: true, psi_basta: null, max_velicina: 'svi', radno_vreme: null, kratak_opis: null, premium: false, poslednja_provera: null, voda_za_pse: null, hlad: null, ogradjeno: null });
  for (const area of Object.keys(areas)) if (!areas[area].length) areas[area].push({ ...areas.beograd[0], id: 900 + Object.keys(areas).indexOf(area) });
  writeFileSync(exportPath, JSON.stringify({ generatedAt: '2026-11-20', areas }));
  const out = join(dir, 'scenarios.json');
  const result = spawnSync(process.execPath, [join(HERE, 'build-scenarios.mjs'), '--candidates', exportPath, '--out', out], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Too few places for a plan in: dan-01/);
  assert.equal(existsSync(out), false);
});
