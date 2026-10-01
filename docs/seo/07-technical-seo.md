# 9. Technical SEO audit and implementation plan

Findings are based on the source code (see `01-site-audit.md`). Items marked **live check** could not be executed from the analysis environment and must be confirmed on the deployed site.

## 9.1 Critical (blocks or caps organic growth)

### C1. Client-side rendering → prerender every public page (static output)

**Problem.** Titles, descriptions, canonicals, Open Graph tags, JSON-LD and the content itself exist only after JavaScript runs and the API answers. Google can render it, but with delay and risk; link-preview crawlers cannot. New place and hub pages would inherit the same weakness.

**Fix.** Angular 19 ships hybrid rendering. Use **prerendering to static files** (no Node server needed, so it deploys to the current Apache host exactly like today):

1. `ng add @angular/ssr` in the portal project; set `"outputMode": "static"` in `project.json` (Angular ≥ 19) so the build emits an `index.html` per prerendered route and no server bundle.
2. Add `app.routes.server.ts` and register it (Angular 19.0: `provideServerRoutesConfig(serverRoutes)`; 19.1+: `provideServerRouting(serverRoutes)`; 20: `provideServerRendering(withRoutes(serverRoutes))` — check the installed version).
3. Prerender everything public; keep admin, login, forms and "near me" client-only; use `getPrerenderParams` to enumerate places, hubs and articles from the API or the threshold job's URL list:

```ts
import { RenderMode, ServerRoute, PrerenderFallback } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin/**',      renderMode: RenderMode.Client },
  { path: 'login',         renderMode: RenderMode.Client },
  { path: 'dodaj-lokaciju', renderMode: RenderMode.Client },
  { path: 'u-blizini',     renderMode: RenderMode.Client },
  { path: 'mesto/:slug',   renderMode: RenderMode.Prerender,
    fallback: PrerenderFallback.Client,           // a place added after the build still works
    async getPrerenderParams() {
      const slugs = await fetchJson(`${API}/pet-friendly-spots/slugs`); // new, slugs only, no images
      return slugs.map((slug: string) => ({ slug }));
    } },
  { path: ':location',               renderMode: RenderMode.Prerender, getPrerenderParams: locationsAboveThreshold },
  { path: ':location/:category',     renderMode: RenderMode.Prerender, getPrerenderParams: locationCategoriesAboveThreshold },
  { path: ':location/:category/strana/:page', renderMode: RenderMode.Prerender, getPrerenderParams: paginatedPages },
  { path: 'blog/:slug',    renderMode: RenderMode.Prerender, getPrerenderParams: publishedPostSlugs },
  { path: '**',            renderMode: RenderMode.Prerender },   // all static routes
];
```

4. Make components server-safe: guard `window`, `navigator.geolocation`, `localStorage`, Leaflet and AOS behind `isPlatformBrowser` / `afterNextRender`; remove `@defer (on timer(100ms))` around primary content (use `@defer (on viewport)` only for maps and secondary modules); fetch data in route resolvers so the prerenderer waits for it; use `provideClientHydration(withEventReplay())` and `TransferState` so the browser does not refetch what the HTML already contains.
5. API endpoints used at build time must be light: add `…/slugs` and `…/sitemap` style endpoints that return ids, slugs and `updated_at` without base64 images (the catalogue already has `?fields=sitemap`).
6. **Rebuild on content change:** a GitHub Actions workflow (or a cron on the host) that runs `nx build gde-sa-psom-portal` + `generate-sitemap` and deploys via SFTP/rsync nightly and on demand (webhook from the admin "publish" action). Until a route is rebuilt, `PrerenderFallback.Client` keeps new pages working as today.

**Why not full SSR with a Node server?** The host serves static files and PHP-style handlers; a Node process would be new infrastructure. Static prerender gives 100% of the SEO benefit for content that changes a few times a day.

### C2. Soft 404s → real 404s

- Replace `{ path: '**', redirectTo: '' }` with a `NotFoundComponent` that sets `<meta name="robots" content="noindex">` and shows search + top links.
- Prerender `/404` and add in `.htaccess`: `ErrorDocument 404 /404/index.html`.
- Rewrite rules: serve the prerendered file if it exists; otherwise fall back to `index.html` **only** for dynamic prefixes (`/mesto/`, `/park/`, `/veterinar/`, `/pet-shop/`, `/hrana-za-pse/`, `/blog/`, and location patterns), and return a real 404 for everything else. A place page whose API lookup fails must render the NotFound component with `noindex` (status stays 200 in the fallback case, which is acceptable; Google treats noindex + "not found" content as a soft 404 and drops it).

### C3. Crawlable links and pagination

- Card: `<a [routerLink]="['/mesto', spot.slug]">` instead of the button.
- Path-based pagination `/beograd/kafici/strana/2` with `<a>` links; keep "Vidi više" as enhancement.
- Breadcrumbs, nearby and related modules on every leaf page (section 8).

### C4. URL migration and host canonicalisation (`.htaccess`)

```apache
RewriteEngine On

# https + www, single hop
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} !^www\.gdesapsom\.com$ [NC]
RewriteRule ^(.*)$ https://www.gdesapsom.com/$1 [R=301,L]

# no trailing slash (except root); directories are served from index.html below
DirectorySlash Off
RewriteCond %{REQUEST_URI} ^(.+)/$
RewriteRule ^ %1 [R=301,L]

# legacy URLs
RewriteRule ^all-spots$            /mesta           [R=301,L]
RewriteRule ^pet-parks$            /parkovi-za-pse  [R=301,L]
RewriteRule ^vet-clinics$          /veterinari      [R=301,L]
RewriteRule ^pet-shops$            /pet-shopovi     [R=301,L]
RewriteRule ^pet-shops/(.+)$       /pet-shop/$1     [R=301,L]
RewriteRule ^dog-food$             /hrana-za-pse    [R=301,L]
RewriteRule ^dog-food/(.+)$        /hrana-za-pse/$1 [R=301,L]
RewriteRule ^about-us$             /o-nama          [R=301,L]
RewriteRule ^for-business$         /za-biznise      [R=301,L]
RewriteRule ^cookies-policy$       /politika-kolacica [R=301,L]
# /spots/{id} → /mesto/{slug}: generated map, one line per id
RewriteMap spots txt:/path/spots-redirects.txt   # (in vhost) or use a RewriteRule per id in a generated include
RewriteCond %{QUERY_STRING} ^spotType=Restoran$
RewriteRule ^all-spots$ /restorani? [R=301,L]

# API never indexed
<If "%{REQUEST_URI} =~ m#^/api/#">
  Header set X-Robots-Tag "noindex, nofollow"
</If>

# prerendered pages: /beograd → /beograd/index.html
RewriteCond %{DOCUMENT_ROOT}/$1/index.html -f
RewriteRule ^(.+)$ /$1/index.html [L]

# SPA fallback only for dynamic prefixes; everything else is a real 404
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^(mesto|park|veterinar|pet-shop|hrana-za-pse|blog)/ /index.html [L]
ErrorDocument 404 /404/index.html
```

Adjust to the host's actual directives (if `RewriteMap` is unavailable, generate a `spots-redirects.conf` with one `RewriteRule ^spots/21$ /mesto/witch-bar-beograd [R=301,L]` per id as part of the sitemap job). **Live check:** confirm today's `http→https` and apex→www behaviour before changing anything.

### C5. Images as URLs, not base64

Move place photos out of MySQL columns into files (`/img/mesta/{slug}-1.webp`) or an object store/CDN; generate 480/960/1440 px WebP (AVIF optional) at upload; serve with `srcset`, `width`/`height`, `loading="lazy"` below the fold and `fetchpriority="high"` for the first image; add `image` to JSON-LD and `og:image` per page. Keep base64 only as a transitional read path in the mobile app. This also shrinks list API responses from megabytes to kilobytes.

### C6. Metadata correctness

- Remove the `CollectionPage`/`ItemList` block from `index.html` (render it in the homepage component only); keep `Organization` and `WebSite`; point `SearchAction.target` to `https://www.gdesapsom.com/mesta?q={search_term_string}` and make `/mesta` read `q`.
- Remove `meta keywords`, `revisit-after`, `meta name="title"` (noise).
- `og:url`, `og:image`, `twitter:*` per page come from the prerendered head; make `SeoService.update()` the single writer and call it from route resolvers.
- Canonical: self-referencing on every indexable page; strip filter params but **keep** the pagination path; never canonicalise page 2 to page 1.

### C7. Sitemaps

- Generate on the server or in the build, never by hand: `sitemap.xml` as an index → `sitemap-mesta.xml`, `sitemap-parkovi.xml`, `sitemap-veterinari.xml`, `sitemap-pet-shopovi.xml`, `sitemap-hrana.xml`, `sitemap-lokacije.xml` (hubs and combination pages), `sitemap-blog.xml`; `lastmod` from `updated_at`; only indexable URLs (same list as prerender). Add an image sitemap or `<image:image>` entries once images are URLs.
- Keep the existing shrink guard; add a "check" step in CI.

### C8. Search Console and measurement (live check)

Verify both the Domain property and the `www` URL-prefix property; submit the sitemap index; enable the Core Web Vitals and Page Experience reports; check "Crawled – currently not indexed" for `/spots/*` monthly. Connect GA4 and GSC. This is the only way to replace the "data unavailable" volumes with real numbers.

## 9.2 Important (do within the roadmap)

| Area | Issue | Action |
|---|---|---|
| Core Web Vitals | Budgets allow 2–3 MB initial JS; five UI frameworks are dependencies; two font sources; AOS on every list | Measure with PageSpeed Insights (live check). Remove unused frameworks (Bootstrap if Tailwind/DaisyUI is the system; Ionic from the portal bundle), self-host fonts via `@fontsource` with `font-display: swap` and drop the Google Fonts stylesheet, lazy-load Leaflet on viewport, drop AOS on list pages, set stricter budgets (initial ≤ 500 kB). Targets: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on mobile. |
| Mobile SEO | Layout is responsive; the bottom sheet filter hides the categories from the HTML (client-only) | After prerender, ensure category/township links exist in the HTML outside the sheet. |
| robots.txt | Fine | Add `Disallow: /api/`, `Disallow: /dodaj-lokaciju`, `Disallow: /dodaj-park`, `Disallow: /u-blizini`; reference the sitemap index. |
| Language toggle | English switches content in place | Until `/en` exists, give the toggle `rel="nofollow"` and make sure the prerendered HTML is Serbian. |
| Structured data QA | Only places/blog/catalogue have JSON-LD | Validate every template in the Rich Results Test; add a unit test that snapshots JSON-LD per template (there is already `structured-data.spec.ts`). |
| Service worker | Caches API responses for 1 day with `freshness` | Fine for users; make sure the SW does not serve stale `index.html` to crawlers (Googlebot ignores SWs; nothing to change). |
| 404 monitoring | None | GSC "Not found" report + server log sample monthly; keep the redirect list growing. |
| Blog images | External placeholders (`placedog.net`) | Replace with owned images; external random images can change meaning and leak referrers. |
| Security headers vs SEO | CSP uses `unsafe-inline`/`unsafe-eval` | No SEO impact; note for the security backlog. |

## 9.3 Nice to have

- `hreflang` and `/en` mirror (only after Serbian pages are indexed and stable): `<link rel="alternate" hreflang="sr-Latn" href="https://www.gdesapsom.com/beograd">`, `hreflang="en"` → `/en/belgrade`, `x-default` → Serbian. Translate hub and destination pages first; place pages can share data with English labels.
- IndexNow key for Bing/Yandex (cheap, part of the sitemap job).
- RSS feed for `/blog` (feeds get picked up by aggregators and some news apps).
- HTTP caching: long `Cache-Control` for hashed assets, short for HTML; Brotli; HTTP/2 (live check).
- Preconnect to the API host if it stays on the apex domain; better: serve the API under `www` or a `api.` subdomain and preconnect once.
- Author pages and an editorial policy page for E-E-A-T.
- Lighthouse CI in GitHub Actions with performance and SEO budgets.
- Log-file sampling once a quarter to see what Googlebot actually crawls.

## 9.4 Checklist of items to verify on the live site (could not be tested here)

1. `curl -I http://gdesapsom.com/` → one `301` to `https://www.gdesapsom.com/`.
2. `curl -I https://www.gdesapsom.com/ovo-ne-postoji` → today `200` (expected); after the fix `404`.
3. `curl -I https://www.gdesapsom.com/all-spots/` and `/All-Spots` → 301 to the canonical form.
4. GSC URL Inspection on `/spots/21`: rendered `<title>` contains the venue name; JSON-LD present.
5. PageSpeed Insights mobile for `/`, `/all-spots`, `/spots/21`, `/blog/<slug>`: record LCP, INP, CLS, TBT and total JS; keep as the baseline for the roadmap.
6. Rich Results Test on one place page and one blog post.
7. `https://www.gdesapsom.com/sitemap.xml` is reachable, matches the repo, and is submitted.
8. The API responses for list endpoints: size per page (expect ~5 MB today), to justify C5.
