# 13. 90-day roadmap (October – December 2026) and 14. Final strategy

## 13.1 How the roadmap is organised

- **HIGH IMPACT / LOW EFFORT** items are configuration, copy and small code changes a developer can ship in hours or a few days each. They go first because they stop the current leaks (soft 404s, uncrawlable links, wrong schema) and start the measurement needed for everything else.
- **HIGH IMPACT / HIGH EFFORT** items are the structural changes (prerendering, URL architecture, data model, images). They start in month 1 and ship in month 2, before the ski-season demand for Kopaonik and Zlatibor.
- Content and outreach run in parallel from week 1 because they do not depend on the rebuild; they just link to old URLs until the 301s exist.

## 13.2 Month 1 — October 2026: stop the leaks, lay the foundations

**HIGH IMPACT / LOW EFFORT**

| # | Action | Owner | Notes |
|---|---|---|---|
| 1 | Search Console: verify Domain + `www` properties, submit sitemap, record baseline (indexed URLs, impressions, CWV) | Owner | Required for every later decision |
| 2 | Live checks from section 9.4 (redirect chain, soft 404, URL Inspection on a place page, PageSpeed baseline) | Dev | 1 hour; document results in `01-site-audit.md` |
| 3 | `.htaccess`: single 301 to `https://www.` for all variants; `X-Robots-Tag: noindex` on `/api/` | Dev | Fixes the duplicate http/apex indexing seen in the index |
| 4 | Replace `redirectTo: ''` with a `NotFoundComponent` (noindex, search box, links) | Dev | Soft-404 fix, part 1 |
| 5 | Cards: `<a [routerLink]>` instead of button + navigate; add a visible breadcrumb component | Dev | Place pages become crawlable from lists |
| 6 | `index.html`: remove `CollectionPage` block, `meta keywords`, `revisit-after`; fix `SearchAction` target; `og:url`/`og:image` from `SeoService` only | Dev | Schema correctness |
| 7 | Replace "1.000+" claims with live counts; add "Provereno" date field to the admin and the place page | Dev + Owner | Trust and helpful-content alignment |
| 8 | Add place types "Vikendica / kuća za odmor" and "Seosko domaćinstvo"; add dog-rule fields (indoor, water bowl, fee, fenced yard, max size) to the admin form | Dev | Unlocks the vikendice cluster and the unique content |
| 9 | Hand-write intros for the first 8 hub pages (Beograd, Beograd × kafići/restorani/parkovi, Novi Sad, Zlatibor × smeštaj, Kopaonik × smeštaj, Tara × smeštaj) | Editor | Needed before the pages exist in month 2 |
| 10 | Publish the October articles (section 7: #1–#10), each linking to list pages and ≥3 places | Editor | Current URLs; the 301 map carries the links over |
| 11 | Outreach wave 1: World Animal Day data story; link-page requests (divcibare.rs, vetks.org.rs, vet.bg.ac.rs); free citations (imenik.rs, planplus.rs, yellowpages.rs, firmesrbije.rs) | Owner | Section 12.6 |
| 12 | Build the Belgrade dog-park dataset v1 from TOB + Zelenilo + field checks | Owner | The first link asset |

**HIGH IMPACT / HIGH EFFORT (start now, ship in month 2)**

| # | Action | Notes |
|---|---|---|
| 13 | Data model: `location`, `location_township`, `category`, `spot_meta` (slug, slug_history, description, dog rules, hours, verified_at), `spot_image`, `spot_review` (section 3.2); slug generation for all 127 places; id → slug redirect map | Legacy tables untouched |
| 14 | Angular prerender (`@angular/ssr`, `outputMode: static`, server routes, resolvers, browser-only guards, hydration) on a staging build | Section 9, C1 |
| 15 | Image pipeline: upload → WebP variants → URL; migration script for existing base64 photos | Section 9, C5 |
| 16 | Light API endpoints: slugs/sitemap feeds without images; threshold job that outputs the indexable URL list | Shared by prerender and sitemap |

## 13.3 Month 2 — November 2026: ship the new architecture before ski season

**HIGH IMPACT / HIGH EFFORT**

| # | Action | Notes |
|---|---|---|
| 17 | Release: new URL structure (`/beograd`, `/beograd/kafici`, `/mesto/{slug}`, `/zlatibor/smestaj`, national hubs), 301 map in `.htaccess`, prerendered static output, sitemap index, real 404 | One release, tested on staging with the Rich Results Test and a crawl (Screaming Frog or similar) |
| 18 | New place page template with dog-rule block, photos as URLs, hours, nearby/related modules, FAQ, breadcrumbs, full JSON-LD | Section 6 |
| 19 | Destination pages for Zlatibor and Kopaonik (hub + `/smestaj`) with hand-written guides; collect at least 10 accommodation listings each with fee/size data (direct outreach to hosts) | Timed for December demand |
| 20 | Belgrade park pages (`/park/{slug}`) from dataset v1; `/beograd/parkovi-za-pse` with township sections | Link asset goes live |

**HIGH IMPACT / LOW EFFORT**

| # | Action | Notes |
|---|---|---|
| 21 | Novi Sad hub + `/novi-sad/kafici` (credit the community sources); Niš hub if ≥ 10 listings | Threshold-based |
| 22 | November articles (#11–#20); refresh the EU-rules post with the 2026 easing and links | |
| 23 | Outreach wave 2: TOB, TO Zlatibor, TOS/Bilten, welcometoserbia.gov.rs, Novi Sad media and pet-friendly.rs, KSRS show guides, ORCA | Section 12.3 |
| 24 | Update the Android app and share links to `/mesto/{slug}`; Google Play listing links to the new URLs | Keeps brand links consistent |
| 25 | Monitoring: GSC coverage after release (expect temporary dips while 301s settle), 404 report, JSON-LD errors | Weekly for 4 weeks |

## 13.4 Month 3 — December 2026: depth, freshness, performance

**HIGH IMPACT / LOW EFFORT**

| # | Action | Notes |
|---|---|---|
| 26 | Visit-report form ("Bio/bila sam ovde sa psom") with moderation; show dated reports on place pages | Freshness + UGC; `AggregateRating` only when real |
| 27 | Data FAQ blocks on hub and category pages; "Ažurirano" dates everywhere | Section 4.3 |
| 28 | December articles (#21–#30); Nova godina and zimovanje pieces published by 1 December | Seasonal window |
| 29 | Badge programme to the first 50 venues; trainer and vet guest posts; selo.rs / weekendica data partnership proposal | Section 12 |
| 30 | Orphan report + internal-link audit after the rebuild (every place ≥ 3 inbound links; every article → hub) | Section 8.7 |

**HIGH IMPACT / HIGH EFFORT**

| # | Action | Notes |
|---|---|---|
| 31 | Core Web Vitals pass: remove unused UI frameworks, self-host fonts, lazy Leaflet, drop AOS on lists, budgets ≤ 500 kB initial; re-measure | Section 9.2 |
| 32 | Tara, Divčibare, Vrnjačka Banja destination pages + `/smestaj` pages; `/vikendice` national hub with ≥ 25 holiday homes with fenced-yard data | Section 2 commercial cluster |
| 33 | Automation: nightly build + deploy on publish, sitemap check in CI, Lighthouse CI budgets | Section 9 |
| 34 | Plan `/en` (Belgrade first) and hreflang for Q1 2027 | Nice-to-have, after Serbian pages are stable |

## 13.5 Recommended order of implementation (dependency-aware)

1. Search Console + baseline (1) → 2. host redirects and API noindex (3) → 3. NotFound component (4) → 4. crawlable cards + breadcrumbs (5) → 5. metadata/schema clean-up (6) → 6. honest counts + verified date (7) → 7. categories and dog-rule fields (8) → 8. data model + slugs (13) → 9. light API endpoints + threshold job (16) → 10. prerender on staging (14) → 11. image pipeline (15) → 12. release with 301s, sitemaps, 404 (17) → 13. place template (18) → 14. destination pages Zlatibor/Kopaonik (19) → 15. parks (20) → 16. Novi Sad/Niš hubs (21) → 17. reviews and FAQ (26–27) → 18. CWV pass (31) → 19. remaining destinations + vikendice (32) → 20. automation (33) → 21. English (34). Content and outreach run continuously from week 1.

## 14. Final strategy

### 14.1 What GdeSaPsom.com should focus on first

Make the pages Google needs exist and be readable: prerendered HTML, a city × category URL for every real intent, place pages with slugs and dog rules, and links between them. Everything else (content, links, English) multiplies that base; without it, content and links point at pages that cannot rank.

### 14.2 Which pages to create first

1. `/beograd` and `/beograd/kafici`, `/beograd/restorani`, `/beograd/parkovi-za-pse` (where the listings already are).
2. `/mesto/{slug}` for all 127 places with the new template (migration, not new content).
3. `/zlatibor` + `/zlatibor/smestaj` and `/kopaonik` + `/kopaonik/smestaj` (before December).
4. `/novi-sad` + `/novi-sad/kafici`; `/parkovi-za-pse` national hub with Belgrade park pages.
5. `/vikendice`, then `/tara`, `/divcibare`, `/vrnjacka-banja` with `/smestaj`.

### 14.3 Which keywords to target first

The 20 primary keywords in section 2.3, in this order of page readiness: brand ("gde sa psom", "gde sa psom u beogradu") → Belgrade dining ("pet friendly kafići beograd", "kafići sa psom beograd", "pet friendly restorani beograd") → Belgrade parks ("parkovi za pse beograd", "ograđeni parkovi za pse beograd") → Novi Sad ("pet friendly novi sad", "pet friendly kafići novi sad") → destination accommodation ("pet friendly smeštaj zlatibor", "pet friendly apartmani zlatibor", "pet friendly smeštaj kopaonik") → holiday homes ("vikendica sa psom") → travel informational ("gde sa psom za vikend", "putovanje sa psom", "sa psom na more").

### 14.4 Which content to publish first

October's ten articles (section 7.2): the Belgrade guide, where to walk a dog in Belgrade, the complete Belgrade dog-park list, the two Belgrade dining lists, "gde sa psom za vikend", public-transport rules, and the Zlatibor guide + Zlatibor accommodation list. They target queries with no strong Serbian answer, they feed the pages built in month 2, and the park list doubles as the first link asset.

### 14.5 Which technical issues matter most

Client-side rendering (C1), soft 404s (C2), uncrawlable links and pagination (C3), URL/slug migration with correct 301s and host canonicalisation (C4), base64 images (C5), site-wide schema and static Open Graph (C6), sitemap automation (C7), Search Console baseline (C8). In that order.

### 14.6 How to build topical authority

Cover the full chain DOGS → PET FRIENDLY → PLACES → CITIES → DESTINATIONS → ACTIVITIES with one entity model and one link system: every place links up to its city and category, every city links to its destinations and guides, every guide links down to named places. Publish facts nobody else has (dog rules per venue, verified dates, parks with attributes), keep them fresh with visitor confirmations, put real names on the content, and earn links from the institutions that own the topic in Serbia (tourism organisations, vets, utilities, media) by giving them data they lack.

### 14.7 How to turn organic traffic into users who discover and add places

- Every hub, category and place page ends with two CTAs: "Nedostaje mesto? Dodaj ga za minut" and "Bio/bila si ovde sa psom? Potvrdi podatke". Both work without an account; GA4 already tracks the funnel.
- Articles carry an in-body CTA after the first list ("Pogledaj sve kafiće u Beogradu") and a closing CTA to add a place in the city the article is about.
- Place pages show "Podaci provereni {datum}"; stale pages ask visitors to confirm, which is the cheapest way to keep rankings and data.
- Venue owners get a badge and an "Ažuriraj podatke" link in the approval e-mail; the `/za-biznise` page and the B2B guide ("Kako postati pet friendly kafić") convert venues into listings and links.
- The PWA/app install prompt stays after the second visit; near-me and saved places give returning users a reason to come back without Google.
- Measure monthly: organic sessions → list page views → place page views → directions/call/website clicks → "add place" starts and approvals. The last number is the one the whole strategy serves.

## 14.8 Single prioritized action table

| Priority | Action | Target page / keyword | Expected SEO purpose | Implementation difficulty |
|---|---|---|---|---|
| 1 | Verify Search Console, submit sitemap, record baseline | all | Measurement; replaces "data unavailable" with real queries | Low |
| 2 | Single 301 to `https://www.`; `noindex` on `/api/` | host | Remove duplicate http/apex indexing | Low |
| 3 | Real 404 page (NotFound component + prerendered `/404` + Apache 404) | unknown URLs | Stop soft 404s; crawl budget | Low |
| 4 | Crawlable `<a href>` cards, breadcrumbs, path pagination | lists → `/mesto/*` | Discovery and link equity to place pages | Low |
| 5 | Remove site-wide CollectionPage; fix SearchAction; per-page OG via SeoService | `/`, all | Correct structured data and link previews | Low |
| 6 | Replace "1.000+" with live counts; add verified date | `/`, place pages | Trust, helpful-content alignment | Low |
| 7 | Add Vikendica / Seosko domaćinstvo types + dog-rule fields in admin | `/vikendice`, place pages | Unlock the vikendica cluster; unique content | Low–Medium |
| 8 | Data model: location, category, spot_meta (slug, rules, hours), images, reviews | all new pages | Foundation for hubs, slugs, redirects | Medium |
| 9 | Prerender to static HTML (`@angular/ssr`, `outputMode: static`) | all public pages | Content and metadata in HTML; link previews; CWV | High |
| 10 | Image pipeline: base64 → WebP URLs, srcset, og:image | place pages | Google Images, payload size, social | Medium |
| 11 | New URL architecture + 301 map + sitemap index | `/beograd`, `/beograd/kafici`, `/mesto/*` | Pages for every intent; preserve equity | High |
| 12 | Belgrade hub and category pages with hand-written intros + data FAQ | pet friendly beograd; pet friendly kafići beograd; parkovi za pse beograd | Core local rankings | Medium |
| 13 | New place page template (rules block, hours, nearby/related, FAQ, schema) | place pages | Long-tail + internal links + rich results | Medium |
| 14 | Zlatibor and Kopaonik destination hubs + `/smestaj` with fee/size data | pet friendly smeštaj zlatibor/kopaonik | Commercial pages before ski season | Medium |
| 15 | Belgrade dog-park dataset + park pages | parkovi za pse beograd; `/park/*` | Uncontested local query + link asset | Medium |
| 16 | October content batch (10 articles) | gde sa psom u beogradu; gde šetati psa; gde sa psom za vikend | Informational entry points feeding hubs | Medium |
| 17 | Outreach wave 1: data story, link pages, citations | brand/entity | First referring domains; entity consistency | Low |
| 18 | Novi Sad hub + kafići page (credit community) | pet friendly novi sad | Second city rankings | Medium |
| 19 | Outreach wave 2: TOB, TO Zlatibor, TOS, gov.rs, NS media, KSRS, ORCA | hubs and destinations | Authoritative local links | Medium |
| 20 | Visit reports + FAQ blocks + "Ažurirano" dates | place and hub pages | Freshness, UGC, trust | Medium |
| 21 | Core Web Vitals pass (bundle diet, fonts, lazy map) | all | Page experience; mobile rankings | Medium–High |
| 22 | Tara, Divčibare, Vrnjačka Banja pages + `/vikendice` hub | pet friendly smeštaj tara/divčibare/vrnjačka banja; vikendica sa psom | Remaining commercial cluster | Medium |
| 23 | Nightly build/deploy, sitemap check, Lighthouse CI | all | Keeps prerendered pages fresh automatically | Medium |
| 24 | Badge programme + guest posts (trainers, vets) + data partnerships (selo.rs, weekendica) | place pages, hubs | Sustainable links from venues and partners | Medium |
| 25 | `/en` mirror for Belgrade with hreflang | dog friendly belgrade | Visitor traffic; later expansion | High |
