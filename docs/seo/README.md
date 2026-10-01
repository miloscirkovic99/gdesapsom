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
