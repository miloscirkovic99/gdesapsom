# GdeSaPsom.com — SEO strategy and developer roadmap

Prepared 2026-10-01 from the source code in this repository, the committed sitemap, search-index research on Serbian competitors and link targets, and a review of how Serbian users phrase these searches. It is written to be handed to a developer and an editor as the working plan for the next six months.

## Documents

| File | Covers | Request sections |
|---|---|---|
| `01-site-audit.md` | What the site is today: rendering, URLs, metadata, schema, content, performance signals, and what must be checked live | Audit |
| `02-keyword-research.md` + `keywords.csv` | 199 Serbian keywords in 16 clusters with intent, location, competition, difficulty, priority and target page; 20/30/50/20/20/10 prioritization with reasons | 1, 2 |
| `03-architecture-and-programmatic-seo.md` | URL architecture, routing, data model, redirect map, thin/duplicate rules, programmatic page matrix and index thresholds | 3, 4 |
| `04-local-seo-and-place-page-template.md` | Serbian local SEO (city, destination, place pages, NAP, GBP, citations, authority) and the element-by-element place page template | 5, 6 |
| `05-content-strategy.md` | Six-month plan with 57 articles (keyword, intent, title, URL, internal links, CTA) and what to do with existing posts | 7 |
| `06-internal-linking.md` | Link modules per template, anchor rules, 30 concrete links, orphan prevention | 8 |
| `07-technical-seo.md` | Critical vs important vs nice-to-have, with Angular 19 prerender plan, `.htaccess`, sitemaps, images, CWV, live checklist | 9 |
| `08-schema.md` | JSON-LD per page type with examples | 10 |
| `09-competitors-and-backlinks.md` | Verified competitor landscape, feature comparison, gaps, and a concrete outreach plan with named targets and templates | 11, 12 |
| `10-roadmap-and-final-strategy.md` | 90-day roadmap (high impact / low effort vs high effort), implementation order, final strategy, single prioritized table | 13, 14 |

## The ten findings that drive the plan

1. **The site is a client-side Angular app with no prerendering.** Titles, descriptions, canonicals, Open Graph and JSON-LD are written by JavaScript after an API call. Google copes, slowly and unreliably; link-preview crawlers do not. This is the first thing to fix.
2. **There are no pages for the queries people type.** Category is a query parameter (`/all-spots?spotType=Restoran`) whose canonical is stripped; there are no city, category or destination URLs. "Pet friendly kafići Beograd" has nowhere to land.
3. **Place pages are near-orphans.** List cards use a button + `router.navigate`, not links; "Vidi više" is in-memory. Crawlers reach `/spots/{id}` only via the sitemap and the homepage's random panel.
4. **Every unknown URL redirects to the homepage** and the host answers every path with 200: the site cannot produce a 404.
5. **Photos are base64 blobs in MySQL** (~187 KB per place): no image URLs for Google Images or social previews, multi-megabyte list responses.
6. **Schema is partly right and partly wrong:** good LocalBusiness subtypes per place, but a homepage `CollectionPage` block ships on every page and the `SearchAction` points at a filter value.
7. **Dog-friendliness data is thin:** only dog size and garden; no indoor rule, fee, water bowl, fenced yard, hours or verified date. These fields are the unique content no competitor has.
8. **Holiday homes and destinations do not exist in the data model**, although they are the dominant pet-friendly accommodation type and the strongest commercial queries (Zlatibor, Kopaonik, Tara, Divčibare, Vrnjačka Banja).
9. **No Serbian competitor combines nationwide coverage, per-venue dog rules, parks, vets and crawlable city × category pages.** The two threats are petfriendlyhoteli.com (editorial velocity on travel topics) and Booking.com's `/pets/` hierarchy (accommodation head terms).
10. **Search volumes are not available from this environment** and were not invented. Import `keywords.csv` into Google Keyword Planner (Serbia / Serbian) and let Search Console data replace the qualitative ratings within a quarter.

## Verified vs assumed

- **Verified from code:** everything in `01-site-audit.md` labelled "Verified (code)" or "(sitemap)"; route list, metadata, schema, sitemap composition (127 places, 6 posts), data model, rendering mode.
- **Verified from the search index only (no page was opened):** competitor URLs, titles and snippet counts in `09-…`; link targets marked [IDX]. Items marked [MEN]/[UNV] were not confirmed.
- **Not verified (environment could not reach the live site):** HTTP redirects, live 404 behaviour, Core Web Vitals, Search Console coverage, deployed sitemap. A checklist is in `07-technical-seo.md`, section 9.4.
- **Qualitative judgements:** competition and difficulty ratings, index thresholds, priorities, and the 90-day targets in the backlink plan are expert estimates, not measurements.

## How to use this

1. Developer: read `01`, `07`, `03`, `08`, then the table in `10` (section 14.8) and work top-down.
2. Editor: read `02` (sections 2.3–2.4), `05`, `06`; start the October batch now on current URLs.
3. Owner: read `10`, run the live checks in `07` (9.4), set up Search Console, and start `09` section 12.6 week 1.

## Implementation log

Items refer to the prioritized table in `10-roadmap-and-final-strategy.md`, section 14.8.

- **2026-10-01** — Items 2–5 and the counts half of 6 implemented in the portal: single-hop `301` to `https://www.` plus `X-Robots-Tag: noindex` on `/api/` and a real `404` for paths outside the app's routes (root `.htaccess`; **must be verified on the live host**, see `DEPLOYMENT_CHECKLIST.md`); `**` route renders a not-found page with `noindex` instead of redirecting home, and detail pages whose entity is missing do the same; list cards link to `/spots/:id` with real `<a href>`; visible breadcrumbs with `BreadcrumbList` JSON-LD on all detail and list pages; `/all-spots` got an H1; `index.html` lost the site-wide `CollectionPage`, `meta keywords`, `revisit-after`, `meta name="title"` and the hardcoded `og:url`, and the `SearchAction` now targets the real search (`/all-spots?word=`); the homepage renders its own `CollectionPage`; the "1.000+" / "100+" claims are gone. Not done: path pagination (belongs with item 11) and the "Provereno" date (needs a backend field, item 7).

- **2026-10-15** — Hub pages for the queries Search Console showed the site had no page for: "pet friendly smeštaj srbija" (average position 50–62), "pet friendly novi sad" (54.5), "pet friendly kafići/restorani novi sad" (16–23), "hoteli koji primaju kućne ljubimce – novi sad/beograd" (16–27). Part of items 11, 12, 14 and 18, on the final URL scheme of section 3.2 so they need no redirect later: national hubs `/smestaj`, `/kafici`, `/restorani`, `/barovi`, city hubs `/beograd`, `/novi-sad`, and every city × category page (`/novi-sad/kafici`, `/beograd/smestaj`, …). The list lives in `apps/gde-sa-psom-portal/src/app/features/pet-friendly/pet-friendly-taxonomy.json`, which the router and `tools/generate-sitemap.mjs` both read. Each page has its own Serbian title and description, an H1 with both phrasings ("pet friendly kafići u Novom Sadu" / "kafići u koje možete sa psom"), an introduction, the live listings from `pet-friendly-spots/search-query`, practical tips, an FAQ with live counts and names (`FAQPage`), `CollectionPage` + `ItemList` and `BreadcrumbList`; city hubs also list the city's dog parks and vets. A city × category page with fewer than 3 listings, or a hub with none, renders `noindex` and stays out of the sitemap. The hubs are linked from the navbar (smeštaj), the footer (all hubs), the homepage (category chips and a cities/smeštaj row, which replaced the `/all-spots?spotType=` links), `/all-spots`, and every spot page (breadcrumb through city and category, "Još pet friendly mesta" links). Spot titles read "X – pet friendly kafić u Novom Sadu" instead of "X - Kafić u Novi Sad". The API circuit breaker no longer counts a 404 "no results" answer as an outage (five empty searches used to switch spot search off for a minute). Not done: prerendering (item 9), which would put this content into the initial HTML.

### Deploying the hub pages (2026-10-15)

1. **`.htaccess` (required).** The host only falls back to `index.html` for the paths in its SPA list and answers everything else with a real 404, so the hubs must be added to that list or they will 404 live. Add next to the existing fallback rules, and extend both lists when a city or category is added to the taxonomy:

   ```apache
   # Pet-friendly hubs (pet-friendly-taxonomy.json)
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(kafici|restorani|barovi|smestaj|beograd|novi-sad)$ /index.html [L]
   RewriteCond %{REQUEST_FILENAME} !-f
   RewriteCond %{REQUEST_FILENAME} !-d
   RewriteRule ^(beograd|novi-sad)/(kafici|restorani|barovi|smestaj)$ /index.html [L]
   ```

2. **Sitemap.** The committed `sitemap.xml` only gained `/privacy-policy` and the six national and city hubs. Run `yarn generate-sitemap` where the API is reachable: it adds the city × category pages that pass the threshold and drops a hub without listings.
3. **Check live:** `curl -I https://www.gdesapsom.com/smestaj`, `/novi-sad` and `/novi-sad/kafici` answer `200`; `/novi-sad/teretane` answers `404`.
4. **Search Console:** resubmit the sitemap and request indexing (URL Inspection) for `/smestaj`, `/novi-sad`, `/beograd`. Recheck the queries above after 2–4 weeks.

- **2026-10-16** — Search Console ("Why pages aren't indexed") showed live pages excluded by `noindex`, among them the site's most visited article (`/blog/nova-eu-pravila-putovanje-pas-april-2026`, crawled 9 Oct) and `/spots/16`, plus apex and www copies of the same pages as "Duplicate without user-selected canonical". Cause of the first: `Disallow: /api/`, added to `robots.txt` on 1 Oct. Google does not fetch robots-blocked URLs while rendering, so every API call failed for Googlebot, and the spot and blog pages answered any failed request with "not found" + `noindex`. Clicks fell from 31 in September to 2 in the first half of October. Fixed: `/api/` is crawlable again (API responses stay out of the index through the `X-Robots-Tag: noindex` header), and spot and blog pages only set `noindex` when the API answers that the item does not exist; a failed request shows a retry and stays indexable, as the catalogue pages already did. A unit test keeps `/api/` out of `robots.txt`. Cause of the second: `https://gdesapsom.com/…` was still answering 200 on 13 Oct, so the single 301 to `https://www.` from 1 Oct is not active on the live host (see below).

### After deploying the robots.txt fix (2026-10-16)

1. Check the redirect on the live host. Each of these must answer a single `301` with `Location: https://www.gdesapsom.com/…`:
   `curl -sI https://gdesapsom.com/spots/142`, `curl -sI http://gdesapsom.com/pet-parks`, `curl -sI http://www.gdesapsom.com/spots/148`.
   If not, add this at the top of the root `.htaccess`. The API stays on the apex host, and a 301 would turn its POST requests into GETs, so `/api/` is excluded:

   ```apache
   RewriteEngine On
   RewriteCond %{REQUEST_URI} !^/api/
   RewriteCond %{HTTPS} off [OR]
   RewriteCond %{HTTP_HOST} !^www\.gdesapsom\.com$ [NC]
   RewriteRule ^(.*)$ https://www.gdesapsom.com/$1 [R=301,L]
   ```

   If the host terminates TLS in front of Apache and this loops, replace `%{HTTPS} off` with `%{HTTP:X-Forwarded-Proto} !https`.
2. Old URLs from earlier versions of the site still get crawled: `/onama` and `/about` can 301 to `/about-us`; `/kafic/{id}` can 301 to `/spots/{id}` only if the ids are the same (check one in the admin first).
3. Search Console: Settings → robots.txt → request a recrawl of `https://www.gdesapsom.com/robots.txt` and `https://gdesapsom.com/robots.txt`. Then URL Inspection → Test live URL on the EU article, `/spots/16`, `/spots/142` and `/all-spots`: under "Page resources" nothing may be "blocked by robots.txt", the screenshot must show the content and "Indexing allowed" must be Yes. Request indexing for each, then "Validate fix" on "Excluded by 'noindex' tag" and "Duplicate without user-selected canonical".


- **2026-10-19** — Winter pages and build-time prerendering (in progress, uncommitted). `/zimovanje-sa-psom`, `/zimovanje-sa-psom/{kopaonik,zlatibor,tara}` and `/putovanje-sa-psom-u-eu` are prerendered by `nx build` with `@angular/ssr` (`outputMode: "static"`, no Node server in production); every other route stays client-rendered (`app.routes.server.ts`). The pages render from `features/winter/winter-data.json`, a snapshot written before the build, and editor copy in `winter-content.json`. A page with nothing of its own yet (a destination without stays, the EU guide without sections) renders as `noindex` and stays out of the sitemap; `tools/generate-sitemap.mjs` applies the same rule. Shell components no longer touch `window`, `localStorage` or cookies while prerendering, and the browser hydrates the prerendered HTML (`provideClientHydration`) instead of redrawing it. After hydration the pages ask `GET winter/destinations` once and switch to the live lists (`WinterLiveData`), so a place deleted from the database disappears before the next build; a destination that would lose more than half of four or more stays keeps the snapshot. The EU guide's text is drafted in `docs/seo/eu-putovanje-nacrt.md` and stays unpublished until its sources are checked.

### Releasing the winter pages

1. Paste `apps/api/v2/winter/destinations.GET.js` into MARS once (generated by `node tools/build-mars-api.mjs`, see `apps/api/README.md`).
2. Before every build that should carry new places: `node tools/fetch-winter-data.mjs` (or `nx run gde-sa-psom-portal:fetch-winter-data`). It writes `winter-data.json` only when the places changed, refuses a destination that would lose more than half of its stays (`--allow-shrink` overrides), and `--check` exits 2 when the file is stale.
3. `nx build gde-sa-psom-portal`, then `node tools/generate-sitemap.mjs`: a destination with at least one stay becomes `index` and enters the sitemap in the same release.

### Deploying the prerendered pages (draft — confirm against the host)

1. **No `index.html` any more.** With prerendering on, Angular writes the client-side shell as `browser/index.csr.html` (the root `index.html` only exists when `/` itself is prerendered). Every SPA fallback rule that points at `/index.html` must point at `/index.csr.html`. The service worker already uses it (the builder sets `ngsw.json` `index` to `/index.csr.html`).
2. **Serve `<path>/index.html` for a prerendered path, without a trailing-slash redirect.** Apache's `DirectorySlash` would answer `/zimovanje-sa-psom` with a 301 to `/zimovanje-sa-psom/`, a different URL from the canonical. If the host runs Apache with `.htaccess`, something like this before the SPA fallback (to be adapted to the existing file):

   ```apache
   DirectorySlash Off
   # Prerendered pages: /zimovanje-sa-psom → /zimovanje-sa-psom/index.html
   RewriteCond %{REQUEST_URI} !^/api/
   RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
   RewriteRule ^(.+?)/?$ /$1/index.html [L]
   ```

   The existing SPA fallback rules keep their path lists (so unknown URLs stay a real 404); only their target changes from `/index.html` to `/index.csr.html`, e.g. `RewriteRule ^(kafici|restorani|barovi|smestaj|beograd|novi-sad)$ /index.csr.html [L]`. The root `/` also needs `DirectoryIndex index.csr.html` (or a rule for `^$`).
3. **Check live:** `curl -s https://www.gdesapsom.com/zimovanje-sa-psom/kopaonik | grep -o '<h1[^<]*</h1>'` shows the H1 without JavaScript, `curl -sI` answers `200` with no redirect, and `/about-us` still loads the app.
