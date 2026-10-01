# 8. Internal linking strategy

## 8.1 Current state (verified)

- Lists link to places through a JavaScript `button` → `router.navigate(...)`; there is no `<a href>`, so crawlers cannot follow list → place.
- The only crawlable links to places are the random panel on the homepage.
- Place pages link only "back" (a button that navigates to `/all-spots`); no breadcrumb, no related or nearby places, no city or category link.
- Footer: about, cookies, privacy, all places, parks, dog food, pet shops. Navbar: home, about, blog, business, and a dropdown with the five list pages.
- Blog posts do not link to places or list pages.

Result: authority arrives at the homepage and stops there. The fix is structural, not editorial: every template gets fixed link modules, and editors add contextual links on top.

## 8.2 The topical chain to build

```
PSI (audience)                      blog guides: putovanje sa psom, pravila, prevoz
   └─ PET FRIENDLY (promise)        homepage, /mesta, /za-biznise, "Ljubimci dobrodošli" guide
        └─ MESTA (categories)       /kafici, /restorani, /hoteli, /apartmani, /vikendice, /parkovi-za-pse, /veterinari
             └─ GRADOVI (cities)    /beograd, /novi-sad, /nis  →  /beograd/kafici …  →  /beograd/vracar/kafici
                  └─ DESTINACIJE    /zlatibor, /kopaonik, /tara, /divcibare, /vrnjacka-banja  →  /zlatibor/smestaj
                       └─ AKTIVNOSTI  šetnje, planinarenje, jezera, izleti (articles) → parks, trails, cafés near them
                            └─ POJEDINAČNA MESTA  /mesto/*, /park/*, /veterinar/*  (every leaf links back up and sideways)
```

Links must flow **down** (hub → category → place), **up** (place → category → hub via breadcrumbs), **sideways** (place → nearby/related places; category → sibling categories; city → nearby destinations) and **across types** (article → hubs and places; hub → articles).

## 8.3 Fixed link modules per template

| Template | Mandatory link modules | Count target |
|---|---|---|
| Homepage | City grid (all indexable city hubs), destination grid, category grid, "Najnoviji vodiči" (4 articles), "Nedavno dodato" (8 places as `<a href>`), footer | 40–60 links |
| National category hub (`/kafici`) | Intro links to top 3 cities; table/list of every city/destination that has this category with counts; 12 top places; 3 guides; sibling categories; breadcrumb | 40–80 |
| City hub (`/beograd`) | Category grid with counts; township grid (indexable ones linked); 8–12 places; 3–5 city guides; "Izleti iz Beograda" destinations; breadcrumb; CTA | 40–70 |
| City × category (`/beograd/kafici`) | Breadcrumb; township chips (linked only if indexable); 20 places per page + pagination; sibling categories in the city; same category in 3 other cities; 2 guides; parent hub | 35–60 |
| Destination hub (`/zlatibor`) | Breadcrumb; `/zlatibor/smestaj` + type pages; 6 accommodation cards; dining pages + 4 cards; 2–3 guides; nearby destinations (Tara, Zlatar, Mokra Gora); nearest city hub (Užice if it exists) | 30–50 |
| Place page (`/mesto/*`) | Breadcrumb (city, category); township link; 4–6 nearby places (cross-category) + nearest park + nearest vet; 4–6 related places (same category, same city); the guide that mentions the place (if any); "Sva pet friendly mesta u {grad}" | 15–25 |
| Park / vet / shop page | Same as place page, with "kafići u blizini parka" for parks | 15–25 |
| Article | Contextual links in the body (hub + category + 3–10 places by name); "Povezani vodiči" (3); a CTA box to the relevant hub | 8–20 |
| Footer (site-wide) | Top 6 cities/destinations, top 6 categories, blog, za biznise, dodaj lokaciju, o nama, legal. Keep it under ~25 links; it is not the place for every township. | ≤ 25 |
| Navbar | Mega-menu: Gradovi (Beograd, Novi Sad, Niš), Destinacije (Zlatibor, Kopaonik, Tara, Divčibare, Vrnjačka Banja), Kategorije, Blog, Za biznise | ≤ 20 |

## 8.4 Anchor text rules

- Descriptive and varied, never "ovde" or "klikni": "pet friendly kafići u Beogradu", "kafići na Vračaru u koje možete sa psom", "smeštaj na Zlatiboru koji prima pse".
- Place links use the venue name, optionally with the type: "Witch Bar (bar, Vračar)".
- Do not repeat the identical anchor to the same URL more than twice on a page.
- Breadcrumb anchors are the short names ("Beograd", "Kafići"); body anchors can be the long phrasing.

## 8.5 Concrete link examples

| From | To | Anchor (Serbian) | Module |
|---|---|---|---|
| `/` | `/beograd` | Gde sa psom u Beogradu | City grid |
| `/` | `/zlatibor/smestaj` | Pet friendly smeštaj na Zlatiboru | Destination grid |
| `/kafici` | `/beograd/kafici` | Pet friendly kafići u Beogradu (87) | City list with counts |
| `/kafici` | `/novi-sad/kafici` | Kafići sa psom u Novom Sadu (14) | City list |
| `/beograd` | `/beograd/kafici` | Kafići u koje možete sa psom | Category grid |
| `/beograd` | `/beograd/parkovi-za-pse` | Ograđeni parkovi za pse u Beogradu | Category grid |
| `/beograd` | `/beograd/vracar` | Vračar (23 mesta) | Township grid |
| `/beograd` | `/divcibare` | Divčibare – vikend sa psom na 100 km od Beograda | "Izleti iz Beograda" |
| `/beograd` | `/blog/pas-u-gradskom-prevozu-beograd` | Pravila za pse u gradskom prevozu | Guides |
| `/beograd/kafici` | `/mesto/witch-bar-beograd` | Witch Bar | Card |
| `/beograd/kafici` | `/beograd/restorani` | Pet friendly restorani u Beogradu | Sibling categories |
| `/beograd/kafici` | `/novi-sad/kafici` | Kafići sa psom u Novom Sadu | Same category, other cities |
| `/beograd/kafici` | `/blog/pet-friendly-kafici-beograd` | Naš izbor: 20 kafića u koje možete sa psom | Guides |
| `/beograd/vracar/kafici` | `/beograd/kafici` | Svi pet friendly kafići u Beogradu | Parent link / breadcrumb |
| `/mesto/witch-bar-beograd` | `/beograd/barovi` | Barovi u Beogradu u koje možete sa psom | Breadcrumb |
| `/mesto/witch-bar-beograd` | `/park/tasmajdan-beograd` | Najbliži park za pse: Tašmajdan (650 m) | Nearby |
| `/mesto/witch-bar-beograd` | `/mesto/{nearby-cafe}` | {Naziv} (kafić, 300 m) | Nearby |
| `/mesto/witch-bar-beograd` | `/veterinar/{slug}` | Najbliži veterinar | Nearby |
| `/park/tasmajdan-beograd` | `/beograd/kafici` | Kafići u blizini Tašmajdana u koje možete sa psom | Cross-category |
| `/zlatibor` | `/zlatibor/smestaj` | Smeštaj na Zlatiboru koji prima pse | Hero CTA |
| `/zlatibor` | `/tara` | Tara sa psom | Nearby destinations |
| `/zlatibor/smestaj` | `/zlatibor/vikendice` | Vikendice na Zlatiboru sa dvorištem | Type pages |
| `/zlatibor/smestaj` | `/blog/zlatibor-sa-psom-vodic` | Vodič: Zlatibor sa psom | Guides |
| `/blog/gde-setati-psa-u-beogradu` | `/beograd/parkovi-za-pse` | svi parkovi za pse u Beogradu | Body |
| `/blog/gde-setati-psa-u-beogradu` | `/mesto/{cafe-near-ada}` | {Naziv} na Adi | Body |
| `/blog/sa-psom-na-more` | `/vikendice` | pet friendly vikendice u Srbiji (ako ipak ostajete kod kuće) | CTA box |
| `/blog/putovanje-sa-psom-vodic` | `/blog/pasos-za-psa-srbija` | pasoš za psa | Body |
| `/za-biznise` | `/blog/kako-postati-pet-friendly-kafic` | Kako postati pet friendly kafić | Body |
| Any page | `/dodaj-lokaciju` | Dodaj mesto | CTA (nofollow not needed; the page is noindex) |

## 8.6 Technical requirements for the links to count

1. Every link is an `<a href="…">` rendered in the prerendered HTML (Angular `routerLink` renders `href`; `(click)` handlers do not). Replace the card button.
2. Pagination links are real URLs (`/beograd/kafici/strana/2`), not a "Vidi više" button only; the button can stay as a progressive enhancement.
3. Breadcrumbs are visible HTML plus `BreadcrumbList` JSON-LD.
4. Nearby/related modules are computed at build time (geo distance, same category) so they appear in the static HTML.
5. No link to a `noindex` or redirected URL from templates; the sitemap/threshold job exposes the list of indexable URLs that templates use.
6. Keep link counts per page within the targets above; a 400-link footer dilutes everything.

## 8.7 Orphan prevention

- A nightly report lists any published place without at least three inbound internal links (from its city × category page, a nearby module, or an article) and any article without a link to a hub.
- The sitemap is a safety net, not a substitute: every URL in the sitemap must also be reachable by links within three clicks from `/`.
