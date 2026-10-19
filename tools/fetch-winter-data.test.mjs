/**
 * node --test tools/fetch-winter-data.test.mjs
 *
 * The script accepts exactly what GET winter/destinations produces
 * (apps/api/lib/winter/snapshot.js), and refuses anything else.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { destinationSlugs, normalizeSnapshot, shrinking } from './fetch-winter-data.mjs';

const require = createRequire(import.meta.url);
const { buildWinterSnapshot } = require('../apps/api/lib/winter/snapshot.js');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SLUGS = destinationSlugs(readFileSync(join(ROOT, 'apps/gde-sa-psom-portal/src/app/features/winter/winter-pages.ts'), 'utf8'));

const apiSnapshot = () =>
  buildWinterSnapshot({
    destinations: [
      { id: 1, slug: 'kopaonik', naziv: 'Kopaonik', lat: '43.285700', lng: '20.809400', gondola_psi: '1', gondola_provereno: '2026-10-01', zicare_psi: null, zicare_provereno: null },
      { id: 2, slug: 'zlatibor', naziv: 'Zlatibor', lat: '43.727700', lng: '19.696000', gondola_psi: null, gondola_provereno: null, zicare_psi: null, zicare_provereno: null },
      { id: 3, slug: 'tara', naziv: 'Tara', lat: '43.852600', lng: '19.427800', gondola_psi: null, gondola_provereno: null, zicare_psi: null, zicare_provereno: null },
    ],
    places: [
      { id: 101, naziv: 'Hotel', kategorija: 'smestaj', adresa: 'Suvo Rudište', destinacija_id: 1, premium: 1, doplata_za_psa: '10.00', doplata_valuta: 'EUR', doplata_po: 'noc', max_pasa: 2, pas_sme_sam_u_sobi: 1, max_velicina_psa: 'svi', affiliate_url: 'https://partner.example/101' },
      { id: 103, naziv: 'Restoran', kategorija: 'restoran', destinacija_id: 1, psi_unutra: 1 },
      { id: 3000001, naziv: 'Staza', kategorija: 'staza', destinacija_id: 1, duzina_km: '4.5', kratak_opis: 'Kroz šumu.' },
      { id: 2000001, naziv: 'Vet', kategorija: 'veterinar', lat: '43.286', lng: '20.615', telefon: '036 000 000' },
    ],
    today: '2026-11-20',
  });

test('the portal has pages for kopaonik, zlatibor and tara', () => {
  assert.deepEqual(SLUGS, ['kopaonik', 'zlatibor', 'tara']);
});

test('accepts the API snapshot unchanged', () => {
  const api = JSON.parse(JSON.stringify(apiSnapshot()));
  assert.deepEqual(normalizeSnapshot(api, SLUGS), api);
});

test('drops fields the portal does not read', () => {
  const api = JSON.parse(JSON.stringify(apiSnapshot()));
  api.destinations.kopaonik.stays[0].internalNote = 'x';
  api.destinations.extra = api.destinations.kopaonik;
  const out = normalizeSnapshot(api, SLUGS);
  assert.equal('internalNote' in out.destinations.kopaonik.stays[0], false);
  assert.deepEqual(Object.keys(out.destinations), SLUGS);
});

test('refuses a non-https affiliate link, a missing destination or a bad date', () => {
  const bad = (change) => {
    const api = JSON.parse(JSON.stringify(apiSnapshot()));
    change(api);
    return () => normalizeSnapshot(api, SLUGS);
  };
  assert.throws(bad((api) => (api.destinations.kopaonik.stays[0].affiliateUrl = 'javascript:alert(1)')), /affiliateUrl/);
  assert.throws(bad((api) => delete api.destinations.tara), /destinations\.tara/);
  assert.throws(bad((api) => (api.generatedAt = 'danas')), /generatedAt/);
  assert.throws(bad((api) => (api.destinations.kopaonik.gondola.dogsAllowed = 'da')), /gondola/);
});

test('flags a destination that would lose over half of 4+ stays', () => {
  const stays = (n) => ({ destinations: { kopaonik: { stays: Array.from({ length: n }, (_, i) => ({ id: i + 1 })) } } });
  assert.deepEqual(shrinking(stays(4), stays(1)), ['kopaonik']);
  assert.deepEqual(shrinking(stays(4), stays(2)), []);
  assert.deepEqual(shrinking(stays(3), stays(0)), []);
});

test('end to end: --dry-run against a local API, and a clear error for an HTML answer', async () => {
  const body = JSON.stringify(apiSnapshot());
  const server = createServer((req, res) => {
    if (req.url === '/api/v2/winter/destinations') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(body);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!doctype html>');
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const run = (apiBase) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [join(ROOT, 'tools/fetch-winter-data.mjs'), '--dry-run'], {
        env: { ...process.env, WINTER_API_BASE: apiBase, NO_PROXY: '127.0.0.1', no_proxy: '127.0.0.1' },
      });
      let out = '';
      child.stdout.on('data', (d) => (out += d));
      child.stderr.on('data', (d) => (out += d));
      child.on('close', (status) => resolve({ status, out }));
    });
  try {
    const ok = await run(`${base}/api/v2`);
    assert.equal(ok.status, 0, ok.out);
    assert.match(ok.out, /kopaonik: 1 stays, 1 restaurants, 1 trails, vet yes/);
    assert.match(ok.out, /nothing written|No change/);

    const html = await run(`${base}/wrong`);
    assert.equal(html.status, 1);
    assert.match(html.out, /expected JSON/);
  } finally {
    server.close();
  }
});
