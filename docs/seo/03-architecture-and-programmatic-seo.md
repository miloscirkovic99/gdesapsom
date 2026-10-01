# 3. Information architecture and 4. Programmatic SEO

## 3.1 Design goals

The architecture has to let one page answer one search intent, keep every listing reachable in three clicks from the homepage, scale from 127 places to 5,000 without manual URL work, survive a listing changing category or city, and leave room for English and for other countries. The current site fails the first two: category is a query parameter and place pages are reachable only through the sitemap.

## 3.2 Recommended URL structure

Serbian, Latin script, lowercase, ASCII only (no diacritics in slugs), hyphens, **no trailing slash** (keeps the existing convention and the current `SeoService` behaviour).

```
/                                  Homepage: "Gde sa psom – pet friendly mesta u Srbiji"

/mesta                             All places + search/filter UI (replaces /all-spots)
/mapa                              Map of all places (link magnet, indexable)
/u-blizini                         GPS "near me" (client-rendered; noindex unless it carries real copy)

/kafici  /restorani  /barovi  /splavovi  /hoteli  /apartmani  /vikendice  /smestaj
/parkovi-za-pse  /veterinari  /pet-shopovi  /hrana-za-pse
                                   National category hubs: intro + list of cities/destinations
                                   with counts + top places + guides

/beograd                           City hub: "Gde sa psom u Beogradu"
/beograd/kafici                    City × category (the core local pages)
/beograd/restorani  /beograd/barovi  /beograd/splavovi  /beograd/hoteli
/beograd/apartmani  /beograd/parkovi-za-pse  /beograd/veterinari  /beograd/pet-shopovi
/beograd/kafici/strana/2           Pagination (path-based so it can be prerendered)
/beograd/vracar                    Township hub (Belgrade only; threshold-based)
/beograd/vracar/kafici             Township × category (threshold-based)

/novi-sad, /nis, /kragujevac, …    Same pattern for every city that passes the threshold

/zlatibor                          Destination hub: "Gde sa psom na Zlatiboru"
/zlatibor/smestaj                  Destination × all accommodation (hotels + apartments + holiday homes)
/zlatibor/hoteli  /zlatibor/apartmani  /zlatibor/vikendice   (only above threshold, else they
                                   301 to /zlatibor/smestaj)
/zlatibor/restorani  /zlatibor/kafici
/kopaonik, /tara, /divcibare, /vrnjacka-banja, /fruska-gora, /sokobanja, /palic, …

/mesto/witch-bar-beograd           Place page (flat, stable; slug = name + city)
/park/tasmajdan-beograd            Park page (new)
/veterinar/{slug}                  Vet page (new)
/pet-shop/{slug}                   Pet shop page (rename of /pet-shops/{slug})
/hrana-za-pse/{slug}               Product page (rename of /dog-food/{slug})

/blog  /blog/{slug}                Articles and guides (kept; add categories Vodiči, Putovanja, Saveti, Vesti)
/o-nama  /za-biznise  /kontakt  /aplikacija  /politika-privatnosti  /politika-kolacica
/dodaj-lokaciju  /dodaj-park       Forms (noindex)
/en/…                              Future English mirror (hreflang), see section 9
```

### Why these choices

- **City/destination hubs at the root** (`/beograd`, `/zlatibor`) give the shortest, most "typeable" URLs and match how people phrase the query ("gde sa psom u Beogradu", "Zlatibor sa psom"). Cities and destinations are the same entity type (`location`) with a `kind` field, so routing is one pattern. A `/grad/` or `/destinacije/` prefix would add nothing for users and would split one entity into two code paths.
- **City × category second** (`/beograd/kafici`) rather than `/kafici/beograd`: the user picks *where* first, then *what*; breadcrumbs read naturally (Početna › Beograd › Kafići) and the hub inherits authority from all its children. The national hub `/kafici` still exists for "pet friendly kafići Srbija" and as the parent of all city versions.
- **Flat place URLs** (`/mesto/{slug}`) instead of nesting under city and category: a venue that changes category (bar → café) or whose township is corrected does not change URL, routing has no ambiguity with township pages, and the hierarchy is expressed through breadcrumbs (visible and in schema) and internal links. The slug includes the city so it stays unique and keyword-bearing.
- **`/smestaj` as the aggregate accommodation page per destination** because the dominant phrasing is "pet friendly smeštaj Zlatibor", not "hoteli"; type-specific pages exist only when they have enough listings on their own.
- **Serbia at the root, other countries later under a prefix** (`/crna-gora/budva`) or a separate language tree. Putting `/srbija/` in front of every URL now would lengthen every URL for the only market that exists.
- **Township pages only in Belgrade, only above thresholds.** Belgrade has 17 municipalities and real "kafići Vračar" demand; Novi Sad and Niš do not need the level yet.

### Angular routing notes

Define static routes first, then explicit category children, then the township catch-all, so there is no ambiguity:

```ts
// order matters: static → category children → township → place
{ path: 'mesta' }, { path: 'mapa' }, { path: 'kafici' }, { path: 'restorani' }, … // national hubs
{ path: 'mesto/:slug' }, { path: 'park/:slug' }, { path: 'veterinar/:slug' }, { path: 'pet-shop/:slug' },
{ path: 'blog/:slug' },
{ path: ':location', children: [
    { path: '', component: LocationHubComponent },
    { path: 'smestaj', component: LocationCategoryComponent, data: { category: 'smestaj' } },
    { path: 'kafici',  component: LocationCategoryComponent, data: { category: 'kafici' } },
    … one entry per category slug (finite list, generated from the category table) …
    { path: ':category/strana/:page', component: LocationCategoryComponent },
    { path: ':township', component: LocationHubComponent, data: { level: 'township' } },
    { path: ':township/:category', component: LocationCategoryComponent },
]},
{ path: '**', component: NotFoundComponent }   // real 404 page, never redirectTo: ''
```

### Data model additions (without touching legacy tables)

```
location            id, slug, name, kind (city|destination|township), parent_id, lat, lng,
                    radius_km, intro_html, seo_title, seo_description, is_published, updated_at
location_township   location_id, ops_id      -- maps a destination (Zlatibor) to legacy townships
category            id, slug, name_sr, name_en, group (dining|lodging|outdoor|services),
                    ugo_ids (legacy type ids that roll up into it), min_listings_to_index
spot_meta           iuo_id (FK → info_ug_obj), slug, slug_history, description_html,
                    dogs_indoor, dogs_outdoor_only, water_bowl, dog_menu, dog_fee_rsd,
                    max_dog_size, fenced_yard, leash_required, max_dogs, opening_hours_json,
                    verified_at, source (owner|visitor|editor), created_at, updated_at
spot_image          iuo_id, url, width, height, alt, sort_order, is_primary
spot_review         id, iuo_id, visited_at, dog_size, rating, text, author_name, status
```

`spot_meta.slug_history` (JSON array) lets the router 301 old slugs after a rename. The legacy `info_ug_obj` keeps working for the admin and the mobile app.

## 3.3 Redirect map (301, permanent, one hop)

| From (current) | To (new) |
|---|---|
| `/all-spots` | `/mesta` |
| `/all-spots?spotType=Restoran` | `/restorani` (and Kafić → `/kafici`, Hotel → `/hoteli`, Bar/Pab → `/barovi`, Splav → `/splavovi`, Apartman → `/apartmani`) |
| `/spots/{id}` | `/mesto/{slug}` (lookup table id → slug; keep forever) |
| `/pet-parks` | `/parkovi-za-pse` |
| `/vet-clinics` | `/veterinari` |
| `/pet-shops`, `/pet-shops/{slug}` | `/pet-shopovi`, `/pet-shop/{slug}` |
| `/dog-food`, `/dog-food/{slug}` | `/hrana-za-pse`, `/hrana-za-pse/{slug}` |
| `/about-us` | `/o-nama` |
| `/for-business` | `/za-biznise` |
| `/cookies-policy` | `/politika-kolacica` |
| `/privacy-policy` | `/politika-privatnosti` (update the Google Play listing URL at the same time, or keep this one URL as is) |
| `/spots/new`, `/parks/new` | `/dodaj-lokaciju`, `/dodaj-park` |
| `gdesapsom.com/*`, `http://*` | `https://www.gdesapsom.com/*` |

With static prerendering the redirects live in `.htaccess` (see section 9), which also makes the old `/spots/{id}` URLs work for the Android app's share links until the app is updated.

## 3.4 Thin and duplicate page risks, and the rule for each

| Risk | Where it appears | Rule |
|---|---|---|
| Empty or near-empty combination pages | `/nis/hoteli` with 1 listing, `/beograd/vozdovac/barovi` with 0 | Index thresholds (3.5). Below threshold the URL either does not exist (404) or is `noindex,follow` and links to the parent page. |
| Synonym pages | "kafići sa psom" vs "pet friendly kafići" | Never two URLs for one intent; both phrasings on one page. |
| Filter states | `?velicina=mali&basta=1&sort=ime` | Client-side only; canonical to the clean URL; no links to filtered states in templates. |
| Pagination | `/beograd/kafici/strana/2` | Self-canonical per page, `strana/1` 301s to the base, pages linked with plain `<a href>`. Beyond page 5 consider `noindex` if the pages carry nothing but cards. |
| Place pages with no description, no photo URL, no geo | Many of the 127 today ("null" descriptions) | Place page content gate (section 6): below the gate → `noindex,follow` until completed; the admin shows a "SEO ready" checklist per listing. |
| Township pages in cities with no township demand | `/novi-sad/stari-grad` | Township level enabled per city in `location`; only Belgrade at launch. |
| Language toggle | Same URL serving English after a click | Keep Serbian as the only indexable language until `/en/` exists; the toggle must not change the prerendered HTML. |
| `/mesta` vs category hubs | Both list "all places" | `/mesta` is the search tool with a short intro; hubs carry editorial content and city links. Different purpose, different content. |
| Blog tag/category archives | If a tag page is ever generated | `noindex` unless hand-curated. |
| Mobile app deep links / share URLs | `/spots/{id}` shared from the app | Permanent 301s; update the app to share `/mesto/{slug}`. |

## 4. Programmatic SEO

### 4.1 Is programmatic SEO appropriate here?

Yes, but narrowly. The valuable combinations are *location × category* and *destination × accommodation type*; those are what people search and what the database can fill. Everything else (city × activity, category × attribute, dog size × township) is either informational (better served by one editorial article) or too thin to deserve a URL. The guiding rule: **a generated page is only published when it would still be useful if Google did not exist**, which in practice means enough listings plus data-driven, page-specific content.

### 4.2 The combination matrix

| Combination | Example URL | Index? | Condition |
|---|---|---|---|
| Location hub (city) | `/beograd` | Yes | ≥ 10 published listings across categories, or ≥ 5 plus an editorial guide |
| Location hub (destination) | `/zlatibor` | Yes | ≥ 5 listings (any type) plus an editorial guide; destinations are editorial-first |
| City × dining category | `/beograd/kafici`, `/novi-sad/restorani` | Yes | ≥ 4 listings |
| City × accommodation type | `/beograd/hoteli` | Yes | ≥ 4 listings; otherwise 301 to `/beograd/smestaj` |
| Destination × `smestaj` (aggregate) | `/zlatibor/smestaj` | Yes | ≥ 3 accommodation listings of any type |
| Destination × accommodation type | `/zlatibor/vikendice` | Conditional | ≥ 5 of that type, else 301 to `/zlatibor/smestaj` |
| Destination × dining | `/zlatibor/restorani` | Conditional | ≥ 4 listings |
| City × parks / vets / pet shops | `/beograd/parkovi-za-pse` | Yes | ≥ 3 (parks), ≥ 5 (vets, shops) |
| Township hub | `/beograd/vracar` | Conditional | Belgrade only; ≥ 8 listings in the township |
| Township × category | `/beograd/vracar/kafici` | Conditional | ≥ 5 listings |
| National category hub | `/kafici`, `/vikendice` | Yes | Always (it lists cities); write a real intro |
| Category × attribute | `/beograd/kafici/sa-bastom`, `/beograd/kafici/veliki-psi` | **No** (for now) | Serve as filters; add an H2 section and a sentence with the count on the parent page. Revisit only if Search Console shows attribute queries with impressions. |
| City × activity | `/beograd/setnja-sa-psom` | **No** | One article per activity ("Gde šetati psa u Beogradu") linking to parks and cafés. |
| Category × "u blizini" | `/kafici-u-blizini` | **No** | GPS feature, not a page. |
| Dog size × anything | `/beograd/kafici/mali-psi` | **No** | Filter only. |
| Category × township × attribute | any 3-way combination | **No** | Never. |
| Destination × month / season | `/kopaonik/zima` | **No** | Seasonal articles instead. |

Expected page count at launch (based on the 127 places, mostly Belgrade): roughly 1 city hub + 6–8 city × category pages for Belgrade, 2–4 for Novi Sad, 3–5 destination hubs with 1–2 category pages each, 12 national hubs, 127 place pages, parks and vets pages. Under 250 generated URLs, every one of them defensible.

### 4.3 What makes a generated page non-thin (template content contract)

Every location × category page must render, from data, the following *before* the listing cards:

1. **Title and H1** with location and category in both phrasings (see section 2.4).
2. **A 60–120 word intro** that is either hand-written for top pages (Belgrade, Novi Sad, Zlatibor, Kopaonik) or assembled from facts that differ per page: number of listings, share with a garden, share accepting all dog sizes, the townships/neighbourhoods with the most places, the most recently verified listing. Facts change per page, so the text is unique without "spinning".
3. **Quick filters** as links only when they lead to indexable pages (townships above threshold); otherwise as client-side chips.
4. **The list** (first 20 cards, then path-based pagination), each card an `<a href>` to the place page with name, type, township, dog size, garden/indoor, verified date.
5. **Map** (lazy-loaded below the fold).
6. **Data FAQ** (3–5 questions answered from the data: "Koliko pet friendly kafića ima na Vračaru?", "Da li su veliki psi dozvoljeni?", "Koji kafići imaju baštu?").
7. **Related pages** block: sibling categories in the same location, the same category in nearby locations, the parent hub, 2–3 guides.
8. **Last updated** date (from the newest `updated_at` among listed places) and a "Dodaj mesto" CTA.

A page that cannot render items 1, 2, 4 and 7 is not published.

### 4.4 Generation and maintenance mechanics

- Hub and combination pages are **computed, not stored**: a nightly job (or the sitemap build) evaluates thresholds from the database and writes the list of indexable URLs; the prerender step reads that list; the sitemap reads the same list. One source of truth prevents sitemap/robots/prerender drift.
- When a combination drops below threshold (listings removed), the page switches to `noindex,follow` for 60 days before being removed and 301'd to its parent, so rankings are not lost on a temporary dip.
- Every generated page records which listings it showed at build time; a listing's `updated_at` bumps the `lastmod` of every page that contains it.
- Hand-written intros override generated intros through `location.intro_html` and a `location_category_intro` table; editors start with the eight most valuable pages (Beograd × kafići/restorani/parkovi, Novi Sad hub, Zlatibor/Kopaonik/Tara/Divčibare × smeštaj).
