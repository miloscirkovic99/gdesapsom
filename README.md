# Ko smo mi?

Dobrodošli na *Gde sa psom* – vašu omiljenu platformu koja olakšava putovanja i izlazak sa vašim ljubimcima! Inspirisani svakodnevnim izazovima vlasnika pasa i mačaka, odlučili smo da kreiramo rešenje koje omogućava svima da uživaju u društvu svojih ljubimaca, bez stresa oko toga da li je određeni objekat pet-friendly. Naša misija je jednostavna – omogućiti vlasnicima ljubimaca da brzo i lako pronađu restorane, kafiće, hotele i druge objekte koji su otvoreni za pse i druge kućne ljubimce. Verujemo da ljubimci zaslužuju biti deo naših avantura, a *Gde sa psom* je tu da vam olakša svaki korak.

# Potpuno besplatno!?

Korišćenje naše platforme je potpuno besplatno, kako za korisnike, tako i za vlasnike ugostiteljskih objekata. Dodavanje novih objekata na sajt je jednostavno i besplatno – želimo da naša zajednica raste i da svi ljubitelji životinja imaju pristup najnovijim informacijama. *Gde sa psom* je mesto gde ljubav prema ljubimcima spaja ljude i objekte koji nude prijatel



# Who are we?

Welcome to *Gde sa psom* – your favorite platform that makes traveling and going out with your pets easier! Inspired by the everyday challenges of dog and cat owners, we decided to create a solution that allows everyone to enjoy the company of their pets without the stress of wondering if a particular place is pet-friendly. Our mission is simple – to enable pet owners to quickly and easily find restaurants, cafes, hotels, and other establishments that welcome dogs and other pets. We believe pets deserve to be part of our adventures, and *Gde sa psom* is here to make every step of that journey easier for you.

# Completely Free!?

Using our platform is completely free, both for users and for the owners of hospitality establishments. Adding new places to the site is simple and free – we want our community to grow and for all animal lovers to have access to the latest information. *Gde sa psom* is a place where the love for pets connects people and establishments that offer a friendly environment for our four-legged friends.

# Analytics (GA4) – developer notes

Everything lives in `apps/gde-sa-psom-portal/src/app/core/analytics/`:

| File | Purpose |
| --- | --- |
| `analytics.taxonomy.ts` | Canonical values for every GA4 dimension (`ItemCategory`, `DestinationType`, `ContentType`, `SearchCategory`, `CtaType`, `MapType`, `ListName`, …) plus `toItemCategory()` / `toSearchCategory()` / `toSlug()` normalisers for backend strings. |
| `analytics.events.ts` | Typed parameter shape for every event (`AnalyticsEventMap`). |
| `analytics.service.ts` | The only place that talks to gtag.js. Consent Mode v2, tag loading, page views, sanitisation, dev logging. |
| `scroll-depth.directive.ts` | `[appScrollDepth]` – sends `scroll_depth` at 25/50/75/90 % once per content id. |
| `blog-cta.helper.ts` | Classifies links inside CMS article HTML for `blog_cta_click`. |
| `../services/consent.service.ts` | Wraps the ngx-cookieconsent banner; exposes `analyticsGranted()` / `state()` signals. |

Never call `gtag()` or push to `dataLayer` directly – add a typed method to `AnalyticsService` and a value to the taxonomy instead.

## Consent behaviour (basic Consent Mode v2)

- `consent default` with `analytics_storage`, `ad_storage`, `ad_user_data`, `ad_personalization` all **denied** is pushed at app start.
- gtag.js is injected only after the visitor presses **Prihvatam** on the banner. Until then no Google request is made and no `_ga` cookie exists.
- **Odbijam** is stored for a year; nothing loads. Changing the answer later (cookie policy page → "Promeni izbor") pushes `consent update: denied`, sets `ga-disable-<id>` and deletes `_ga*` cookies.
- Marketing consent is separate and currently always denied (no marketing tags exist).
- A `dismiss` left by the old info-style banner is not consent: the banner is shown again.

## Events

GA4 recommended: `page_view`, `search`, `view_item`, `select_item`, `share`, `login` (`sign_up`, `add_to_wishlist`, `remove_from_wishlist` are typed but have no UI yet).
Custom: `map_open`, `map_marker_click`, `get_directions`, `outbound_click`, `click_to_call`, `view_blog`, `scroll_depth`, `blog_cta_click` (`booking_start` / `booking_success` are typed, no booking flow exists).

One `page_view` per **path** change; query-string changes (`/all-spots?spotType=…`) are covered by `search`, not a new page view.

## GA4 Admin – one-time setup

Register these as **event-scoped custom dimensions** (Admin → Custom definitions), names = parameter names:
`item_category`, `city`, `region`, `content_category`, `content_type`, `search_category`, `search_type`, `destination_type`, `list_name`, `map_type`, `cta_type`, `provider`, `position`, `destination_category`, `destination_city`, `percent_scrolled`.

Suggested key events (conversions): `outbound_click`, `click_to_call`, `get_directions`, `blog_cta_click`.

## Local testing

1. `npx nx serve gde-sa-psom-portal`, open the site, accept the banner.
2. Development builds send `debug_mode`, so events appear in GA4 **Admin → DebugView** within seconds, and every dataLayer push is logged in the browser console as `[GA4] …`. Production builds log nothing.
3. Verify "no consent = no cookies": reject the banner, check DevTools → Application → Cookies: no `_ga*`, and no request to `googletagmanager.com`.
4. Unit tests: `npx nx test gde-sa-psom-portal --testFile=core/analytics`.

## Missing backend fields

- `region` (`view_item`, `select_item`): the API only returns city (`grd_ime`) and municipality (`ops_ime`); no region exists yet.
- `blog_cta_click.destination_category` / `destination_city` for `/spots/:id` links: the article HTML carries only the id. The following `view_item` supplies both.
- Vet clinics: `vetc_id` / `grd_ime` are read defensively; if the list endpoint does not return them the event is sent without `item_id` / `city`.
