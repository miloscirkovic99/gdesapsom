#!/usr/bin/env node
/**
 * Saves the winter pages' data before the build, so the prerendered HTML of
 * /zimovanje-sa-psom/... already lists the places:
 * GET <API>/winter/destinations → apps/gde-sa-psom-portal/.../winter/winter-data.json
 *
 *   node tools/fetch-winter-data.mjs                 fetch and write
 *   node tools/fetch-winter-data.mjs --dry-run       print what would change, write nothing
 *   node tools/fetch-winter-data.mjs --check         exit 2 if the saved file differs from the API
 *   node tools/fetch-winter-data.mjs --allow-shrink  accept a destination losing over half its stays
 *
 *   WINTER_API_BASE=https://gdesapsom.com/api/v2 (default)
 *
 * Only known fields are kept, each checked for type: the file is reviewed in
 * diffs and rendered as is. When the places are unchanged the file is left
 * alone (its date too), so the sitemap's lastmod moves only with real changes.
 * Order of a release: this script, then `nx build`, then the sitemap.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'apps', 'gde-sa-psom-portal', 'src', 'app', 'features', 'winter', 'winter-data.json');
const PAGES = join(ROOT, 'apps', 'gde-sa-psom-portal', 'src', 'app', 'features', 'winter', 'winter-pages.ts');
const API_BASE = (process.env.WINTER_API_BASE ?? 'https://gdesapsom.com/api/v2').replace(/\/+$/, '');
const TIMEOUT_MS = 30_000;

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CHECK = args.has('--check');
const ALLOW_SHRINK = args.has('--allow-shrink');

/** The destination slugs the portal has pages for (WINTER_DESTINATIONS in winter-pages.ts). */
export function destinationSlugs(source) {
  const block = /WINTER_DESTINATIONS[^=]*=\s*\[([\s\S]*?)\];/.exec(source);
  if (!block) throw new Error('WINTER_DESTINATIONS not found in winter-pages.ts');
  return [...block[1].matchAll(/slug:\s*'([a-z0-9-]+)'/g)].map((match) => match[1]);
}

// ── Shape checks: anything unexpected stops the script ─────────────────────
const fail = (path, what) => {
  throw new Error(`${path}: ${what}`);
};
const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function text(value, path, { nullable = false } = {}) {
  if (value === null && nullable) return null;
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected text');
  return value.trim();
}
function number(value, path) {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) fail(path, 'expected a number or null');
  return value;
}
function id(value, path) {
  if (!Number.isInteger(value) || value <= 0) fail(path, 'expected a positive integer id');
  return value;
}
function flag(value, path) {
  if (value !== null && typeof value !== 'boolean') fail(path, 'expected true, false or null');
  return value;
}
function list(value, path, item) {
  if (!Array.isArray(value)) fail(path, 'expected a list');
  return value.map((entry, index) => item(entry ?? fail(`${path}[${index}]`, 'empty'), `${path}[${index}]`));
}

function stay(value, path) {
  const fee = value.dogFee;
  if (fee !== null && (typeof fee !== 'object' || !['RSD', 'EUR'].includes(fee.currency) || !['noc', 'boravak'].includes(fee.per))) fail(`${path}.dogFee`, 'bad fee');
  if (value.affiliateUrl !== null && !/^https:\/\/[^\s"'<>]+$/.test(String(value.affiliateUrl))) fail(`${path}.affiliateUrl`, 'only https links');
  if (value.maxDogSize !== null && !['mali', 'srednji', 'veliki', 'svi'].includes(value.maxDogSize)) fail(`${path}.maxDogSize`, 'unknown size');
  return {
    id: id(value.id, `${path}.id`),
    name: text(value.name, `${path}.name`),
    address: text(value.address, `${path}.address`, { nullable: true }),
    dogFee: fee === null ? null : { amount: number(fee.amount, `${path}.dogFee.amount`) ?? fail(`${path}.dogFee.amount`, 'missing'), currency: fee.currency, per: fee.per },
    maxDogs: number(value.maxDogs, `${path}.maxDogs`),
    dogMayStayAlone: flag(value.dogMayStayAlone, `${path}.dogMayStayAlone`),
    maxDogSize: value.maxDogSize,
    affiliateUrl: value.affiliateUrl,
  };
}

function lift(value, path) {
  if (!value || typeof value !== 'object') fail(path, 'expected an object');
  if (value.checkedAt !== null && !isDate(value.checkedAt)) fail(`${path}.checkedAt`, 'expected YYYY-MM-DD or null');
  return { dogsAllowed: flag(value.dogsAllowed, `${path}.dogsAllowed`), checkedAt: value.checkedAt };
}

function destination(value, path) {
  if (!value || typeof value !== 'object') fail(path, 'missing');
  return {
    stays: list(value.stays, `${path}.stays`, stay),
    restaurants: list(value.restaurants, `${path}.restaurants`, (r, p) => ({ id: id(r.id, `${p}.id`), name: text(r.name, `${p}.name`), address: text(r.address, `${p}.address`, { nullable: true }) })),
    trails: list(value.trails, `${path}.trails`, (t, p) => ({
      id: id(t.id, `${p}.id`),
      name: text(t.name, `${p}.name`),
      lengthKm: number(t.lengthKm, `${p}.lengthKm`),
      description: text(t.description, `${p}.description`, { nullable: true }),
    })),
    gondola: lift(value.gondola, `${path}.gondola`),
    skiLifts: lift(value.skiLifts, `${path}.skiLifts`),
    vet:
      value.vet === null
        ? null
        : {
            id: id(value.vet.id, `${path}.vet.id`),
            name: text(value.vet.name, `${path}.vet.name`),
            address: text(value.vet.address, `${path}.vet.address`, { nullable: true }),
            phone: text(value.vet.phone, `${path}.vet.phone`, { nullable: true }),
            distanceKm: number(value.vet.distanceKm, `${path}.vet.distanceKm`),
          },
  };
}

/** The API answer, checked and reduced to the fields the portal reads, in a fixed order. */
export function normalizeSnapshot(body, slugs) {
  if (!body || typeof body !== 'object' || !body.destinations) fail('response', 'expected { generatedAt, destinations }');
  if (!isDate(body.generatedAt)) fail('generatedAt', 'expected YYYY-MM-DD');
  const destinations = {};
  for (const slug of slugs) destinations[slug] = destination(body.destinations[slug], `destinations.${slug}`);
  return { generatedAt: body.generatedAt, destinations };
}

/** Destinations that would lose more than half of at least 4 stays. */
export function shrinking(previous, next) {
  return Object.keys(next.destinations).filter((slug) => {
    const before = previous?.destinations?.[slug]?.stays?.length ?? 0;
    return before >= 4 && next.destinations[slug].stays.length < before / 2;
  });
}

async function fetchSnapshot() {
  const url = `${API_BASE}/winter/destinations`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    // The host answers an unknown path with the SPA's index.html at HTTP 200.
    if (!(response.headers.get('content-type') ?? '').includes('json')) {
      throw new Error(`expected JSON from ${url}; is apps/api/v2/winter/destinations.GET.js pasted into MARS?`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const slugs = destinationSlugs(readFileSync(PAGES, 'utf8'));
  const next = normalizeSnapshot(await fetchSnapshot(), slugs);
  const previous = existsSync(TARGET) ? JSON.parse(readFileSync(TARGET, 'utf8')) : null;
  const unchanged = previous && JSON.stringify(previous.destinations) === JSON.stringify(next.destinations);

  for (const slug of slugs) {
    const d = next.destinations[slug];
    console.log(`  ${slug}: ${d.stays.length} stays, ${d.restaurants.length} restaurants, ${d.trails.length} trails, vet ${d.vet ? 'yes' : 'no'}`);
  }

  if (CHECK) {
    if (!unchanged) {
      console.error(`${relative(ROOT, TARGET)} is stale: run node tools/fetch-winter-data.mjs`);
      process.exit(2);
    }
    console.log('winter-data.json matches the API.');
    return;
  }
  if (unchanged) {
    console.log('No change; winter-data.json left as it is.');
    return;
  }
  const shrunk = shrinking(previous, next);
  if (shrunk.length && !ALLOW_SHRINK) {
    console.error(`Refusing: ${shrunk.join(', ')} would lose more than half of its stays. Check the API, or pass --allow-shrink.`);
    process.exit(3);
  }
  if (DRY_RUN) {
    console.log('--dry-run: winter-data.json would change; nothing written.');
    return;
  }
  writeFileSync(TARGET, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`wrote ${relative(ROOT, TARGET)} (${next.generatedAt})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
