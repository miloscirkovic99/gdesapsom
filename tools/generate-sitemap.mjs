#!/usr/bin/env node
/**
 * Generates apps/gde-sa-psom-portal/public/sitemap.xml from the live API.
 *
 *   node tools/generate-sitemap.mjs              write the sitemap
 *   node tools/generate-sitemap.mjs --dry-run    print to stdout, write nothing
 *   node tools/generate-sitemap.mjs --check      exit 2 if the committed file is stale
 *   node tools/generate-sitemap.mjs --allow-shrink   bypass the shrink guard
 *
 * Output is a pure function of the API data plus git history: no timestamps are
 * baked in, so re-running with unchanged data produces a byte-identical file.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Config ──────────────────────────────────────────────────────────────────
const SITE_ORIGIN = 'https://www.gdesapsom.com'; // canonical host, matches robots.txt + canonical tag
const API_BASE = process.env['SITEMAP_API_BASE'] ?? 'https://gdesapsom.com/api/v2';

// One spot carries ~187KB of base64 image, so a page of 50 is already ~5.6MB.
// Do not raise this: limit=500 returns ~40MB in one response.
const SPOTS_PAGE_SIZE = 50;
const MAX_SPOT_PAGES = 200; // infinite-loop fuse
const REQUEST_TIMEOUT_MS = 45_000;
const RETRIES = 2;
const SHRINK_GUARD = 0.5; // abort if the new file has under half the URLs of the old one

// Public routes, in the order they should appear. Paths mirror
// src/app/shared/constants/route.constant.ts. `src` is the component directory
// used to derive <lastmod> from git; `seed` is the fallback when git is
// unavailable (shallow clone, tarball export).
// Deliberately absent, and Disallowed in public/robots.txt: /admin*, /login,
// /spots/new, /parks/new.
const STATIC_ROUTES = [
  { loc: '/', src: 'src/app/pages/landing-page', seed: '2026-04-30' },
  { loc: '/all-spots', src: 'src/app/features/pet-spots-facilities', seed: '2026-04-30' },
  { loc: '/pet-parks', src: 'src/app/features/pet-parks', seed: '2026-04-06' },
  { loc: '/vet-clinics', src: 'src/app/features/veterinary-clinics', seed: '2026-04-06' },
  { loc: '/dog-food', src: 'src/app/features/dog-food', seed: '2026-09-04' },
  { loc: '/pet-shops', src: 'src/app/features/pet-shops', seed: '2026-09-04' },
  { loc: '/blog', src: 'src/app/pages/blog/blog-list', seed: '2026-04-30' },
  { loc: '/about-us', src: 'src/app/pages/about-us', seed: '2026-04-06' },
  { loc: '/for-business', src: 'src/app/pages/business-page', seed: '2026-05-01' },
  { loc: '/cookies-policy', src: 'src/app/pages/cookies-page', seed: '2026-04-06' },
];

const APP_DIR = 'apps/gde-sa-psom-portal';
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(REPO_ROOT, APP_DIR, 'public/sitemap.xml');

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const CHECK_ONLY = args.has('--check');
const ALLOW_SHRINK = args.has('--allow-shrink');

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ── Helpers ─────────────────────────────────────────────────────────────────
function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Percent-encode the path, then XML-escape. Both layers are required. */
function buildLoc(pathname) {
  return xmlEscape(new URL(pathname, SITE_ORIGIN).href);
}

async function fetchJson(url, init = {}) {
  let lastError;

  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      console.warn(`  retry ${attempt}/${RETRIES}: ${url}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      // Retry server-side failures, but never a 4xx - that is a bad request, not bad luck.
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
        if (response.status < 500) throw error;
        lastError = error;
        continue;
      }

      // The host answers unknown paths with the SPA's index.html at HTTP 200,
      // so a wrong endpoint would otherwise parse as "no data" instead of failing.
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('json')) {
        throw new Error(
          `expected JSON from ${url} but got "${contentType}" - check that the endpoint path is correct`
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        lastError = new Error(`timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
      } else if (lastError !== error) {
        lastError = error;
      }
      if (attempt === RETRIES) throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/** Last commit date (YYYY-MM-DD) touching `relPath`, or `seed` if git can't say. */
function gitLastmod(relPath, seed) {
  const target = `${APP_DIR}/${relPath}`;
  const log = spawnSync('git', ['log', '-1', '--format=%cs', '--', target], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });

  const committed = log.status === 0 ? log.stdout.trim() : '';
  if (!ISO_DATE.test(committed)) return seed;

  // Uncommitted edits mean the page changed today; converges to the commit date once committed.
  const status = spawnSync('git', ['status', '--porcelain', '--', target], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (status.status === 0 && status.stdout.trim()) {
    return new Date().toISOString().slice(0, 10);
  }

  return committed;
}

// ── Collectors ──────────────────────────────────────────────────────────────
async function getBlogEntries() {
  const data = await fetchJson(`${API_BASE}/blog/getAll`);

  if (!Array.isArray(data?.blogList)) {
    throw new Error('blog/getAll did not return a blogList array');
  }

  const bySlug = new Map();

  for (const post of data.blogList) {
    if (post?.status !== 'objavljen') continue;

    const slug = typeof post.slug === 'string' ? post.slug.trim() : '';
    if (!slug || bySlug.has(slug)) continue;

    // "2026-04-29 01:03:21" -> "2026-04-29". Date-only avoids inventing a
    // timezone the API never sends.
    const published = String(post.objavljen_u ?? '').slice(0, 10);

    bySlug.set(slug, {
      loc: `/blog/${encodeURIComponent(slug)}`,
      lastmod: ISO_DATE.test(published) ? published : null,
    });
  }

  const entries = [...bySlug.values()].sort((a, b) => a.loc.localeCompare(b.loc));
  const dates = entries.map((entry) => entry.lastmod).filter(Boolean);

  return {
    entries,
    latest: dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : null,
  };
}

async function getSpotIds() {
  const ids = new Set();
  let offset = 0;
  let total = null;
  let pages = 0;

  while (pages < MAX_SPOT_PAGES) {
    let data = await fetchJson(`${API_BASE}/pet-friendly-spots/search-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ops_id: null,
        ugo_id: null,
        sta_id: null,
        word: null,
        lat: null,
        lon: null,
        radius: null,
        offset,
        limit: SPOTS_PAGE_SIZE,
      }),
    });

    if (!Array.isArray(data?.spotsList)) {
      throw new Error('pet-friendly-spots/search-query did not return a spotsList array');
    }

    if (total === null) total = Number(data.totalResults);

    for (const spot of data.spotsList) {
      const id = Number(spot?.iuo_id);
      if (Number.isInteger(id) && id > 0) ids.add(id);
    }

    const received = data.spotsList.length;
    data = null; // drop ~5.6MB of base64 before the next page
    pages++;

    if (received === 0) break;
    offset += received;
    if (Number.isFinite(total) && offset >= total) break;
  }

  // Catches a truncated crawl, duplicate ids, and pagination changing mid-run.
  if (Number.isFinite(total) && ids.size !== total) {
    throw new Error(`spot count mismatch: collected ${ids.size} ids but the API reports ${total}`);
  }

  // The API returns spots unsorted and ids are non-contiguous; without this the
  // file reshuffles on every run and the diff is meaningless.
  return [...ids].sort((a, b) => a - b);
}

/**
 * `dog-food/all?fields=sitemap` and `pet-shops/all?fields=sitemap` return
 * `{ data: [{ slug, updatedAt }] }` - slugs only, no images, so one request
 * covers the whole catalog.
 *
 * Until those handlers are pasted into the Mars instance the host answers the
 * URL with the SPA's index.html; fetchJson reports that as "expected JSON".
 * Only that specific case is skipped with a warning - any other failure still
 * aborts the run so a broken API can never silently shrink the sitemap.
 */
async function getCatalogEntries(endpoint, pathPrefix) {
  let data;
  try {
    data = await fetchJson(`${API_BASE}/${endpoint}/all?fields=sitemap`);
  } catch (error) {
    if (!String(error.message).includes('expected JSON')) throw error;
    console.warn(`  ${endpoint}/all is not deployed yet - skipping /${pathPrefix}/* entries`);
    return [];
  }

  if (!Array.isArray(data?.data)) {
    throw new Error(`${endpoint}/all did not return a data array`);
  }

  const bySlug = new Map();

  for (const row of data.data) {
    const slug = typeof row?.slug === 'string' ? row.slug.trim() : '';
    if (!slug || bySlug.has(slug)) continue;

    const updated = String(row.updatedAt ?? '').slice(0, 10);
    bySlug.set(slug, {
      loc: `/${pathPrefix}/${encodeURIComponent(slug)}`,
      lastmod: ISO_DATE.test(updated) ? updated : null,
    });
  }

  return [...bySlug.values()].sort((a, b) => a.loc.localeCompare(b.loc));
}

// ── Output ──────────────────────────────────────────────────────────────────
function buildUrlset(entries) {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Generated by tools/generate-sitemap.mjs - do not edit by hand. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const entry of entries) {
    lines.push('  <url>');
    lines.push(`    <loc>${buildLoc(entry.loc)}</loc>`);
    if (entry.lastmod) lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    lines.push('  </url>');
  }

  lines.push('</urlset>');
  return lines.join('\n') + '\n';
}

function countLocs(xml) {
  return (xml.match(/<loc>/g) ?? []).length;
}

/** Compare ignoring line endings - the repo has core.autocrlf=true. */
function normalize(text) {
  return text.replace(/\r\n/g, '\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Generating sitemap from ${API_BASE}`);

  const [blog, spotIds, dogFood, petShops] = await Promise.all([
    getBlogEntries(),
    getSpotIds(),
    getCatalogEntries('dog-food', 'dog-food'),
    getCatalogEntries('pet-shops', 'pet-shops'),
  ]);
  console.log(`  blog posts: ${blog.entries.length}`);
  console.log(`  spots:      ${spotIds.length}`);
  console.log(`  dog food:   ${dogFood.length}`);
  console.log(`  pet shops:  ${petShops.length}`);

  const entries = [
    ...STATIC_ROUTES.map((route) => {
      const lastmod = gitLastmod(route.src, route.seed);
      // The blog index genuinely changes when a post lands.
      if (route.loc === '/blog' && blog.latest && blog.latest > lastmod) {
        return { loc: route.loc, lastmod: blog.latest };
      }
      return { loc: route.loc, lastmod };
    }),
    ...blog.entries,
    ...spotIds.map((id) => ({ loc: `/spots/${id}`, lastmod: null })), // API has no date field for spots
    ...dogFood,
    ...petShops,
  ];

  if (entries.length < STATIC_ROUTES.length + 1) {
    throw new Error(`refusing to write a sitemap with only ${entries.length} URLs`);
  }

  const xml = buildUrlset(entries);
  const existing = existsSync(OUT_FILE) ? normalize(readFileSync(OUT_FILE, 'utf8')) : null;

  if (existing !== null && !ALLOW_SHRINK) {
    const before = countLocs(existing);
    const after = countLocs(xml);
    if (before > 0 && after < before * SHRINK_GUARD) {
      throw new Error(
        `refusing to shrink the sitemap from ${before} to ${after} URLs. ` +
          `If this is intentional, rerun with --allow-shrink.`
      );
    }
  }

  if (DRY_RUN) {
    process.stdout.write(xml);
    return;
  }

  const unchanged = existing === xml;

  if (CHECK_ONLY) {
    if (unchanged) {
      console.log(`Up to date: ${entries.length} URLs.`);
      return;
    }
    console.error('Sitemap is stale. Run: npx nx run gde-sa-psom-portal:generate-sitemap');
    process.exitCode = 2;
    return;
  }

  if (unchanged) {
    console.log(`Unchanged: ${entries.length} URLs.`);
    return;
  }

  // Write to a temp file in the same directory, then rename - never truncate in place.
  const tmp = `${OUT_FILE}.tmp`;
  try {
    writeFileSync(tmp, xml, 'utf8');
    renameSync(tmp, OUT_FILE);
  } catch (error) {
    if (existsSync(tmp)) unlinkSync(tmp);
    throw error;
  }

  console.log(`Wrote ${entries.length} URLs to ${APP_DIR}/public/sitemap.xml`);
}

main().catch((error) => {
  console.error(`\nSitemap generation failed: ${error.message}`);
  console.error('The existing sitemap.xml was left untouched.');
  process.exitCode = 1;
});
