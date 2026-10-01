# 5. Local SEO strategy for Serbia and 6. The individual place page

## 5.1 How local search works for a directory (and what that means here)

GdeSaPsom is not a local business; it is a publisher of local entities. It cannot rank in the Google Maps pack for "pet friendly kafić Vračar" (only the venues can), but it can own the organic results below the pack for list-type queries and the "which places accept dogs" question that Maps answers badly. The levers are therefore: (1) complete, verified, structured data about every venue, (2) location pages that aggregate those venues with real context, (3) entity consistency between our listing and the venue's own Google Business Profile, and (4) links and mentions from locally relevant sites.

## 5.2 City pages (`/beograd`, `/novi-sad`, `/nis`)

Purpose: answer "gde sa psom u {grad}" and route users to categories.

| Element | Specification |
|---|---|
| Title | `Gde sa psom u Beogradu – pet friendly kafići, restorani, parkovi i hoteli | Gde sa psom` |
| H1 | `Gde sa psom u Beogradu?` |
| Intro (hand-written, 120–200 words) | Mentions the city's context (media report that Belgrade's communal decision has allowed pets in hospitality venues since 2011 and that venues mark themselves with the "Ljubimci dobrodošli" sticker — verify the legal reference before publishing), the number of listings, the strongest townships, and the two or three best-known dog areas (Ada, Tašmajdan, Košutnjak). |
| Category grid | Links to every indexable `/beograd/{category}` page with counts |
| Township grid | Links to township hubs above threshold; the rest as plain text (no link) with counts |
| Map | All Belgrade places, lazy-loaded |
| Top places | 8–12 cards: most recently verified or editor's picks, `<a href>` to place pages |
| Guides | 3–5 articles about the city ("Gde šetati psa u Beogradu", "Pas u gradskom prevozu") |
| Nearby destinations | "Izleti sa psom iz Beograda": Avala, Kosmaj, Fruška gora, Divčibare, Tara |
| FAQ | 4–6 city questions (dogs in public transport, parks with fences, large dogs in cafés, vet on duty) with short answers and links |
| CTA | "Znaš mesto u Beogradu koje nije na listi? Dodaj ga." |
| Schema | `CollectionPage` + `BreadcrumbList` + `ItemList` of the category pages; `about` → `City` (see section 10) |

## 5.3 Destination pages (`/zlatibor`, `/kopaonik`, `/tara`, `/divcibare`, `/vrnjacka-banja`, `/fruska-gora`)

Purpose: answer "Zlatibor sa psom" (planning intent) and send the user to `/zlatibor/smestaj`.

Destinations are editorial-first: the hub is a guide (when to go, what the dog can do, leash rules in nature parks, lakes, which trails, where the vet is) wrapped around the listings. Required blocks: title `Zlatibor sa psom – pet friendly smeštaj, restorani i šetnje | Gde sa psom`; H1 `Gde sa psom na Zlatiboru?`; intro 150–250 words; accommodation block (link to `/zlatibor/smestaj` plus 6 cards with dog fee and size limit visible); dining block; "šetnje i izleti" block (editorial, e.g. Stopića pećina, Ribničko jezero, Tornik — state clearly where dogs are and are not allowed, with the source); practical block (nearest vet, pet shop, taxi that accepts dogs); FAQ; related destinations; schema `TouristDestination` + `BreadcrumbList`.

Destination boundaries live in the `location_township` mapping (Zlatibor → Čajetina municipality townships) plus an optional radius for lodging outside the township list.

## 5.4 Individual place pages — the NAP question

NAP (name, address, phone) consistency is usually about a business's own citations. For a directory it matters in a different way: Google matches our page to the venue's entity. If our name, address and phone format match the venue's Google Business Profile exactly, Google can connect our page to the entity, which helps both the venue (another consistent citation) and us (our page is understood as being *about* that entity).

Rules:
1. Store the venue name exactly as on its Google Business Profile or sign; drop marketing suffixes.
2. Address in the Serbian postal format: `Ulica broj, Opština, Grad`; keep the township field separate; store latitude/longitude from the geocoder and let an admin correct the pin.
3. Phone in international format `+381 11 123 4567`; render as `tel:` link.
4. Link to the venue's website and to its Google Maps place URL in `sameAs`; add Instagram/Facebook when known.
5. Show "Podaci provereni: {date}" and the source (owner, visitor, editor). Stale listings (no verification in 12 months) show a visible notice and ask for an update. Freshness is a ranking and trust signal for local content.

## 5.5 Schema per page type (summary; JSON-LD in section 10)

| Page | Types |
|---|---|
| Restaurant / café / bar / splav | `Restaurant`, `CafeOrCoffeeShop`, `BarOrPub`, `FoodEstablishment` + `BreadcrumbList` |
| Hotel / motel | `Hotel` / `Motel` with `petsAllowed: true` and pet policy in `amenityFeature` |
| Apartment / vikendica | `LodgingBusiness` (`additionalType: VacationRental` for holiday homes), `petsAllowed: true` |
| Park | `Park` with `amenityFeature` (fenced, water, lighting) |
| Vet | `VeterinaryCare` with `openingHoursSpecification` and 24h flag |
| Pet shop | `PetStore` (already implemented) |
| City / category page | `CollectionPage` + `ItemList` + `BreadcrumbList` |
| Destination | `TouristDestination` + `BreadcrumbList` |
| Article | `Article` / `BlogPosting` with real `author` |
| FAQ blocks | `FAQPage` (Google no longer shows FAQ rich results for most sites since 2023; still useful for understanding; keep questions visible on the page) |
| Reviews | `Review` + `AggregateRating` only once there are real visitor reviews; never seed fake ratings |

## 5.6 Google Business Profile (GBP) opportunities

- GdeSaPsom itself should **not** create a GBP unless it has a real, staffed address: Google removes or suspends listings for online-only directories.
- The venues can: Google Business Profile has a "Pet-friendly" / "Dogs allowed" attribute. The `/za-biznise` page and the owner e-mail after approval should ask venues to (a) enable that attribute, (b) add a line "Pet friendly – pronađite nas na gdesapsom.com" in their description, (c) post a GBP update with a photo of a dog guest. This improves the venue's local visibility and creates brand mentions.
- Create a public Google Maps list "Pet friendly Beograd – Gde sa psom" (and one per destination) curated from the directory; it is shareable, embeddable in articles, and a recurring source of brand searches.
- Keep the Google Play listing complete (screenshots, description with "pet friendly Srbija", website link). App store pages rank for brand queries and pass a link.

## 5.7 Local citations

Citations for a directory brand are about the Organization entity: consistent name ("Gde sa psom"), domain, logo, description, founding year, social profiles, contact e-mail, and the same description everywhere. Targets are listed with verification status in section 11/12 (`09-competitors-and-backlinks.md`); the categories are Serbian business directories, startup/product directories (Startit, Product Hunt-style lists), app directories, Wikidata (an entry for the website is legitimate and helps entity recognition), and Crunchbase-type profiles.

## 5.8 Local backlinks (summary; concrete outreach in section 12)

Priority sources, in order of expected effect: tourism organizations (destination and city), municipalities and JKP "Zelenilo" (dog parks data), vet clinics and pet shops (badges, guest content), hotels and holiday homes (the "Psi dobrodošli" badge program), local media (data stories: "X pet friendly kafića u Beogradu"), dog communities and trainers (co-created guides), travel bloggers (destination guides with dogs).

## 5.9 How GdeSaPsom becomes the authority for "dog-friendly" in Serbia

1. **Entity:** one consistent Organization (name, logo, description, social profiles, Wikidata, app stores), author pages for the people behind it, an editorial policy page ("Kako proveravamo mesta").
2. **Coverage:** every category × city that people search, with verified attributes competitors do not have (indoor/outdoor, size limits, fee, water bowl, fenced yard).
3. **Freshness:** verified dates, visitor confirmations, quarterly re-checks of the top 100 listings.
4. **Depth:** destination guides and travel rules written from real visits with photos.
5. **Mentions:** a data story per quarter for media, badges on venue websites, co-branded maps with tourism organizations.
6. **Signals of use:** GA4 already tracks calls, directions and website clicks; those engagement signals correlate with content that keeps ranking.

---

## 6. The individual place page template

Example URL: `/mesto/witch-bar-beograd` (today `/spots/21`). Breadcrumb: `Početna › Beograd › Barovi › Witch Bar`.

### 6.1 Element-by-element

| # | Element | Specification | Value |
|---|---|---|---|
| 1 | **URL** | `/mesto/{name-slug}-{city-slug}`; ASCII; slug history kept for 301s | SEO |
| 2 | **SEO title** (≤ 60 chars) | `{Naziv} – pet friendly {tip} u {opština/grad} | Gde sa psom`. Example: `Witch Bar – pet friendly bar na Vračaru | Gde sa psom` | SEO |
| 3 | **Meta description** (≤ 155 chars) | Unique, factual: `{Naziv} ({tip}, {adresa}) prima pse: {veličina}; {unutra/bašta}; {doplata}. Radno vreme, telefon, mapa i okolna pet friendly mesta.` | SEO (CTR) |
| 4 | **H1** | `{Naziv}` with a visible sub-line `pet friendly {tip} · {opština}, {grad}` (the H1 stays the venue name; the sub-line carries the keyword) | SEO |
| 5 | **Verification line** | `Provereno {datum} · izvor: {vlasnik/posetilac/urednik}` + "Prijavi promenu" link | SEO (freshness) + UX |
| 6 | **Intro** (60–120 words) | Written or structured: what the place is, where exactly, what the dog rules are, one practical tip (water bowl, shaded garden, nearby park). Replaces the current "Kratki opis: /" | SEO |
| 7 | **Dog policy block** | Dog size allowed · dogs allowed indoors (yes/no/garden only) · water bowl · dog menu/treats · dog fee (RSD) · leash required · max dogs · fenced yard (lodging) · last confirmed by | SEO (unique content) + UX |
| 8 | **Address, township, city** | Postal format; township and city are links to `/beograd/vracar` (if indexable) and `/beograd` | SEO + UX |
| 9 | **Amenities** (venue) | Garden, indoor seating, outdoor seating, parking, Wi-Fi, terrace, pool (lodging), kitchen (apartments) | UX (SEO via `amenityFeature`) |
| 10 | **Photos** | 2–6 real photos as **URLs** (WebP, 1200 px, with width/height), alt text `{Naziv} – pet friendly {tip} u {grad}: {bašta/enterijer}`; first photo is the `og:image` | SEO (images, social) + UX |
| 11 | **Opening hours** | Weekly table; "otvoreno sada" indicator computed client-side | SEO (`openingHoursSpecification`) + UX |
| 12 | **Contact** | Phone (`tel:`), website, Instagram/Facebook, e-mail (lodging) | UX (SEO via `telephone`, `sameAs`) |
| 13 | **Map + directions** | Leaflet map (lazy), Google Maps / Waze / Apple Maps buttons (keep existing) | UX |
| 14 | **Nearby pet-friendly places** | 4–6 places within ~1.5 km across categories, plus the nearest dog park and the nearest vet, each an `<a href>` | SEO (internal links) + UX |
| 15 | **Related places** | 4–6 places of the same category in the same city | SEO (internal links) |
| 16 | **FAQ** (3–5) | Data-driven: `Da li su psi dozvoljeni unutra u {Naziv}?`, `Koliko iznosi doplata za psa?`, `Da li {Naziv} ima baštu?`, `Gde je najbliži park za pse?` | SEO (long-tail) + UX |
| 17 | **Reviews / visit reports** | "Bio/bila sam ovde sa psom" form: date, dog size, rating, 1–3 sentences; moderated; shown with dates | SEO (freshness, UGC, later `AggregateRating`) + UX |
| 18 | **Breadcrumb** | Visible + `BreadcrumbList` | SEO |
| 19 | **Share / copy link** | Keep | UX |
| 20 | **CTAs** | "Prijavi grešku", "Ažuriraj podatke (vlasnik)", "Dodaj drugo mesto" | Conversion |
| 21 | **Schema** | LocalBusiness subtype with all fields above | SEO |

### 6.2 Which elements carry SEO value and which are UX

- **Direct SEO value:** URL slug, title, meta description, H1 + sub-line, intro, dog policy block (the unique content no competitor has), photos as URLs with alt text, opening hours, breadcrumb, nearby/related links, FAQ, reviews, structured data, verification date.
- **Primarily UX (indirect SEO through engagement and conversions):** map, directions buttons, "open now", share, amenities icons, phone click (tracked in GA4 as a conversion proxy).
- **Conversion elements:** report/update CTAs and the review form turn visitors into contributors, which is the growth loop this strategy depends on.

### 6.3 Content gate (when a place page is allowed to be indexed)

A place page is `index` only when it has: name, type, city, geo coordinates, at least one photo URL, dog size, indoor/outdoor rule, and either a 40+ word description or at least four filled dog-policy fields. Otherwise it renders with `noindex,follow` and the admin shows the missing fields. This keeps thin listings out of the index while still letting them be found through the site.

### 6.4 Example

```
Title: Witch Bar – pet friendly bar na Vračaru | Gde sa psom
Meta:  Witch Bar (bar, Vračar, Beograd) prima sve pse, i unutra i u bašti, bez doplate.
       Radno vreme, telefon, mapa i pet friendly mesta u blizini.
H1:    Witch Bar
Sub:   pet friendly bar · Vračar, Beograd · provereno 12. 9. 2026.
Intro: Witch Bar je bar na Vračaru u koji možete sa psom bilo koje veličine, i u baštu i
       unutra. Osoblje redovno iznosi posudu sa vodom … Najbliži park za pse je …
```
