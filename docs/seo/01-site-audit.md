# 1. Site audit — what GdeSaPsom.com looks like today (verified from source)

Audit date: 2026-10-01. Source of truth: this repository (`develop` as of commit `f6ef90a`), the committed `apps/gde-sa-psom-portal/public/sitemap.xml`, and the route/metadata code. The live site could not be fetched from the analysis environment (network policy), so every item is labelled **Verified (code)**, **Verified (sitemap)** or **Needs live check**.

## 1.1 Stack and rendering

| Item | Finding | Status |
|---|---|---|
| Framework | Angular 19 single-page app in an Nx monorepo; Ionic/Capacitor Android app shares the data layer. | Verified (code) |
| Rendering | **Client-side rendering only.** `project.json` uses the `application` builder with a `browser` entry and no `server`, `ssr` or `prerender` option; `@angular/ssr` is not a dependency. `index.html` ships an empty `<app-root></app-root>`. | Verified (code) |
| Data source | REST API at `https://gdesapsom.com/api/v2` (MARS host, MySQL). Lists are fetched with `POST pet-friendly-spots/search-query`; a single place with `POST pet-friendly-spots/all/:id`. | Verified (code) |
| Hosting | Apache-style host with `.htaccess` (referenced in `libs/shared/util/src/lib/constants/site.ts`). Unknown paths are answered with `index.html` and HTTP 200 (documented in `tools/generate-sitemap.mjs`). | Verified (code comment) / Needs live check |
| Canonical host | `https://www.gdesapsom.com` (robots.txt, sitemap, `SITE_ORIGIN`). The API is called on the apex host. | Verified (code) |
| PWA | Service worker (`ngsw-config.json`) caches the app shell and API responses (`freshness`, 1 day). | Verified (code) |
| Language | `<html lang="sr">`, Transloco default `rs`, English toggled in place on the same URL (no URL change, no hreflang). No browser-language auto-detection, so crawlers get Serbian. | Verified (code) |

**Why rendering matters most:** every title, description, canonical, Open Graph tag and JSON-LD block for a place or article is written by `SeoService` *after* the API call completes in the browser. Googlebot does execute JavaScript, but it renders in a second pass with a delay and a timeout budget, and any API error or slow response leaves the generic route title in place. Facebook, WhatsApp, Viber, Instagram, LinkedIn and most other link-preview crawlers do not run JavaScript at all, so **every shared link currently shows the homepage title, homepage description and the logo**, because those are the static values in `index.html`.

## 1.2 Public URL inventory

| URL pattern | What it is | Indexability today | Verified |
|---|---|---|---|
| `/` | Landing page: H1, search box, random places, category chips, how-it-works, CTAs. | Indexable | code |
| `/all-spots` | All places, filter UI (township multi-select, dog size, type, free text, near me). Category pre-filter via `?spotType=Restoran`. 10 results, then a "Vidi više" button (POST, no URL change). | Indexable; filters are not pages | code |
| `/spots/:id` | Place page, numeric ID (e.g. `/spots/21`). Title/description/JSON-LD set after data loads. | Indexable; 127 in sitemap | code + sitemap |
| `/pet-parks` | All dog parks in one list + park rules. No per-park page. | Indexable | code + sitemap |
| `/vet-clinics` | All vet clinics with city/township filter. No per-clinic page. | Indexable | code + sitemap |
| `/pet-shops`, `/pet-shops/:slug` | Pet shop catalogue and shop pages (PetStore JSON-LD). | Indexable; **0 in sitemap** (API endpoint not deployed per script comment) | code + sitemap |
| `/dog-food`, `/dog-food/:slug` | Dog food catalogue and product pages (Product JSON-LD). | Indexable; **0 in sitemap** | code + sitemap |
| `/blog`, `/blog/:slug` | 6 published posts (BlogPosting JSON-LD). No pagination. | Indexable | code + sitemap |
| `/about-us`, `/for-business`, `/cookies-policy`, `/privacy-policy` | Static pages. | Indexable | code + sitemap |
| `/spots/new`, `/parks/new`, `/login`, `/admin/*` | Forms / admin. | Disallowed in robots.txt | code |
| `**` (anything else) | **Redirects to `/`** (`redirectTo: ''`). Combined with the host returning 200 for every path, no URL can ever return a 404. | **Soft-404 risk** | code |

Sitemap composition (committed file, 142 URLs): 127 `/spots/{id}`, 6 `/blog/{slug}`, 9 static. Place URLs have no `<lastmod>` because the legacy table has no date column.

## 1.3 What is missing structurally

- **No city pages** (`/beograd`, `/novi-sad`), **no category pages** (`/kafici`, `/restorani`) and **no destination pages** (`/zlatibor`). Category is a query parameter whose canonical is stripped, so "pet friendly restorani Beograd" has no page to rank.
- **No slugs for places**: `/spots/21` carries no keyword and no city. The schema has no `slug` column on `info_ug_obj`.
- **No crawlable links from lists to places.** The card component renders a `<button (click)="openDialog(item)">` that calls `router.navigate(...)`; there is no `<a href>`. Crawlers discover place pages only through the sitemap and the random panel on the homepage (which does use `routerLink`). A place that drops out of the random panel is effectively an orphan.
- **No crawlable pagination.** "Vidi više" appends results in memory; a crawler sees the first 10 places of `/all-spots` only.
- **No breadcrumbs**, no FAQ sections, no reviews or visit reports, no opening hours, no per-place photos as URLs (see images), no "nearby places" or "related places" modules.
- **No holiday-home category.** Place types today: Kafić, Restoran, Splav, Bar, Pab, Hotel, Motel, Apartman, Teretana, Kafeterija, Ostalo (plus separate parks, vets, pet shops). "Vikendica / kuća za odmor" and "Seosko domaćinstvo" do not exist, although they are the dominant pet-friendly accommodation type on Tara, Divčibare and Zlatibor.
- **No destination entity.** Zlatibor is a settlement in Čajetina municipality, Kopaonik spans Raška and Brus, Tara is in Bajina Bašta. The data model only knows country → city (`grad`) → township (`opština`), so destination pages cannot be built from the current schema without a new "destination" mapping.
- **Dog-friendliness attributes are minimal.** Only "dog size allowed" (`starost`: Svi psi / Mali pas / Mali pas i štenci) and "garden" (`basta`: sa baštom / bez bašte). No fields for dogs allowed indoors, water bowl, dog fee, leash policy, fenced yard, dog menu, max dogs, verified date.

## 1.4 Metadata and structured data

| Item | Finding | Verdict |
|---|---|---|
| Route titles/descriptions | Every public route has a Serbian title and description in `app.routes.ts`; `SeoService` applies them on navigation and sets a self-referencing canonical with the query string stripped. | Good foundation |
| Place page title | `{name} - {type} u {city} | Gde sa psom`; description from `iuo_opis` or a generated sentence. Many rows store the literal string "null" as description (handled by `cleanApiText`). | OK but thin; needs real descriptions |
| Site-wide JSON-LD in `index.html` | `Organization`, `WebSite` (+`SearchAction`), **and a `CollectionPage` with an `ItemList`**. Because they live in `index.html`, all three are present on every page, including place pages and blog posts. The `SearchAction` target points to `/all-spots?spotType={search_term_string}`, which is a filter value, not a search. | Fix: move `CollectionPage` to the homepage component, point `SearchAction` to a real search URL |
| Per-page JSON-LD | Place: LocalBusiness subtype (CafeOrCoffeeShop, Restaurant, BarOrPub, Hotel, Motel, LodgingBusiness, ExerciseGym, FoodEstablishment) with address, geo, telephone, sameAs, `petsAllowed` for lodging, `amenityFeature` for others. Blog: BlogPosting. Pet shop: PetStore. Dog food: Product + AggregateOffer. | Good; extend with `image`, `openingHoursSpecification`, `BreadcrumbList` |
| Open Graph / Twitter | Static homepage values in `index.html`; `og:url` hardcoded to the homepage; `SeoService` rewrites them client-side only. `og:image` is the logo (`logo-big.png`), declared 1200×630. | Only correct for the homepage in link previews |
| `meta keywords`, `revisit-after`, `meta name="title"` | Present. Ignored by Google; harmless. | Remove to keep the head lean |
| robots.txt | Allows all, disallows `/admin`, `/login`, `/spots/new`, `/parks/new`; references the sitemap. | Good; add `/api/` and a sitemap index later |
| Social profiles in `sameAs` | Facebook and Instagram `gdesapsom`. | Needs live check that both exist and link back |

## 1.5 Content audit

- **Homepage copy** is good: clear value proposition, Serbian, mentions categories and cities. H1 is brand-led ("Znaj unapred gde je tvoj pas dobrodošao.") and contains no searchable phrase; the first H2s do not mention "Beograd", "Novi Sad" or any category. Trust line is data-driven (counts from the API) — keep.
- **Blog (6 posts):** `gde-sa-psom-za-prvi-maj-srbija`, `nova-eu-pravila-putovanje-pas-april-2026`, `pet-osnovnih-komandi-za-pse`, `sta-pas-sme-da-jede-vodic`, `sterilizacija-kastracija-psa`, `zastita-psa-od-parazita`. Only two posts are about *where to go with a dog*; four are generic pet-care topics that compete with vet and pet-shop blogs and do not lead to listings. Posts without a cover image load a random external image from `placedog.net`.
- **Listing pages** have no editorial text (no intro, no city context). `/pet-parks` has a 13-rule block, which is the only content besides cards.
- **Place pages** show: name, two photos, map, directions, dog size, type, garden, township, address, website, phone, short description (often "/"), share buttons. No opening hours, no verified date, no related places, no breadcrumb.

## 1.6 Performance and asset signals (from code)

- **Images are base64 strings stored in MySQL** (~187 KB per place, per the sitemap script). They are delivered inline inside JSON and rendered as `data:` URLs. Consequences: no image URL for Google Images, no `og:image` per place, a 10-item list response is roughly 1.9 MB, and the service worker caches those payloads. The new catalogue tables already separate thumbnails from full images; the legacy `info_ug_obj` does not.
- **Bundle budgets** are set to 2 MB warning / 3 MB error for the initial bundle. Dependencies include Bootstrap, Tailwind + DaisyUI, Angular Material, Ionic, AOS, Leaflet and Google Fonts (`Dosis`, `Inter`) plus two `@fontsource` families. Actual shipped size was not measured here; the budget alone suggests a heavy initial load for a content site. **Needs live check** with PageSpeed Insights / CrUX.
- Cards use `loading="lazy"` (good). The listing component is wrapped in `@defer (on timer(100ms))`, which delays the primary content on purpose.
- Google Fonts stylesheet is render-blocking; `preconnect` is present.

## 1.7 Verified strengths to keep

- Clean, mostly Serbian route metadata and a working `SeoService` abstraction (canonical, OG, JSON-LD helpers).
- Correct LocalBusiness subtype mapping per place type and `petsAllowed` on lodging.
- Sitemap generator with a shrink guard and git-based `lastmod` for static routes.
- GA4 event vocabulary already tracks outbound clicks, phone clicks, searches and filters (useful for measuring SEO-to-action conversion).
- An Android app on Google Play and a PWA (brand signals and a backlink source).
- Free, community-driven model and a working "suggest a place" flow (the conversion goal of this whole strategy).

## 1.8 Items that must be checked on the live site (could not be verified from here)

1. `http://` → `https://` and `gdesapsom.com` → `www.gdesapsom.com` return a single 301 (not 302, not a chain).
2. `/all-spots/` (trailing slash) and `/All-Spots` (case) behaviour.
3. A random path such as `/ovo-ne-postoji` returns 200 + homepage (expected from code) — confirm, then fix per the technical section.
4. Google Search Console: index coverage for `/spots/*`, "Crawled – currently not indexed" counts, Core Web Vitals report, and whether both `www` and apex properties are verified.
5. URL Inspection → "View crawled page" for one `/spots/{id}` URL: does the rendered HTML contain the place name in `<title>` and the JSON-LD block?
6. PageSpeed Insights for `/`, `/all-spots` and one place page (LCP, INP, CLS, total JS).
7. The deployed `sitemap.xml` matches the committed file and is submitted in Search Console.
8. The Facebook and Instagram profiles referenced in `sameAs` exist and link to the site.

## 1.9 Observed in the search index (not fetched; from the competitor research pass)

- Indexed URLs include both `http://gdesapsom.com/all-spots` and `https://www.gdesapsom.com/…` variants, which means the redirect to the canonical host is either missing, chained, or newer than the index. Confirm with item 1 above.
- A pull request page from the public GitHub repository appears for the brand query "gde sa psom". Harmless once the homepage is prerendered and linked, but worth knowing; making the repository private would remove it.
- The indexed snippet for the homepage says "100+" locations while the on-page trust copy (`trust_verified` in `rs.json`) says "1.000+ proverenih lokacija" and the sitemap holds 127 places. Use live counts only.
- The hiking blog kudasapsom.com ("Kuda sa psom") ranks next to the site for the brand query; it is a brand-confusion risk and a natural partner (see section 11).
