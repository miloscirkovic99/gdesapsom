# 10. Schema.org (JSON-LD) specification

General rules: one `@graph` per page or separate `<script type="application/ld+json">` blocks, all with absolute URLs; every entity has `@id` so pages can reference each other; images are absolute URLs (not `data:`); only mark up what is visible on the page; never invent ratings. Reuse the existing `SeoService.setStructuredData(id, data)` and extend `shared/utils/structured-data.ts`.

Shared nodes used below:

```json
{ "@type": "Organization", "@id": "https://www.gdesapsom.com/#org",
  "name": "Gde sa psom", "alternateName": ["Где са псом", "GdeSaPsom"],
  "url": "https://www.gdesapsom.com", "logo": "https://www.gdesapsom.com/assets/logo-big.png",
  "sameAs": ["https://www.facebook.com/gdesapsom", "https://www.instagram.com/gdesapsom",
             "https://play.google.com/store/apps/details?id=com.gdesapsom.app"] }
```

## 10.1 Homepage

```json
{ "@context": "https://schema.org", "@graph": [
  { "@type": "Organization", "@id": "https://www.gdesapsom.com/#org", "name": "Gde sa psom",
    "url": "https://www.gdesapsom.com", "logo": "https://www.gdesapsom.com/assets/logo-big.png",
    "description": "Besplatan vodič kroz pet friendly kafiće, restorane, hotele, apartmane, vikendice, parkove za pse i veterinare u Srbiji.",
    "foundingDate": "2024", "areaServed": { "@type": "Country", "name": "Serbia" },
    "sameAs": ["https://www.facebook.com/gdesapsom", "https://www.instagram.com/gdesapsom"] },
  { "@type": "WebSite", "@id": "https://www.gdesapsom.com/#website", "url": "https://www.gdesapsom.com",
    "name": "Gde sa psom", "inLanguage": "sr-Latn", "publisher": { "@id": "https://www.gdesapsom.com/#org" },
    "potentialAction": { "@type": "SearchAction",
      "target": { "@type": "EntryPoint", "urlTemplate": "https://www.gdesapsom.com/mesta?q={search_term_string}" },
      "query-input": "required name=search_term_string" } },
  { "@type": "CollectionPage", "@id": "https://www.gdesapsom.com/#page", "url": "https://www.gdesapsom.com",
    "name": "Gde sa psom – pet friendly mesta u Srbiji", "isPartOf": { "@id": "https://www.gdesapsom.com/#website" },
    "mainEntity": { "@type": "ItemList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Pet friendly kafići", "url": "https://www.gdesapsom.com/kafici" },
      { "@type": "ListItem", "position": 2, "name": "Pet friendly restorani", "url": "https://www.gdesapsom.com/restorani" },
      { "@type": "ListItem", "position": 3, "name": "Pet friendly smeštaj", "url": "https://www.gdesapsom.com/smestaj" },
      { "@type": "ListItem", "position": 4, "name": "Parkovi za pse", "url": "https://www.gdesapsom.com/parkovi-za-pse" } ] } }
] }
```

## 10.2 City page (`/beograd`)

```json
{ "@context": "https://schema.org", "@graph": [
  { "@type": "CollectionPage", "@id": "https://www.gdesapsom.com/beograd#page",
    "url": "https://www.gdesapsom.com/beograd", "name": "Gde sa psom u Beogradu",
    "description": "Pet friendly kafići, restorani, barovi, hoteli, parkovi za pse i veterinari u Beogradu – provereno.",
    "inLanguage": "sr-Latn", "isPartOf": { "@id": "https://www.gdesapsom.com/#website" },
    "about": { "@type": "City", "name": "Beograd", "sameAs": "https://www.wikidata.org/wiki/Q3711" },
    "dateModified": "2026-10-01",
    "mainEntity": { "@type": "ItemList", "numberOfItems": 9, "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Pet friendly kafići u Beogradu", "url": "https://www.gdesapsom.com/beograd/kafici" },
      { "@type": "ListItem", "position": 2, "name": "Pet friendly restorani u Beogradu", "url": "https://www.gdesapsom.com/beograd/restorani" },
      { "@type": "ListItem", "position": 3, "name": "Parkovi za pse u Beogradu", "url": "https://www.gdesapsom.com/beograd/parkovi-za-pse" } ] } },
  { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://www.gdesapsom.com" },
      { "@type": "ListItem", "position": 2, "name": "Beograd", "item": "https://www.gdesapsom.com/beograd" } ] }
] }
```

## 10.3 Category page (`/beograd/kafici`, `/zlatibor/smestaj`, `/kafici`)

```json
{ "@context": "https://schema.org", "@graph": [
  { "@type": "CollectionPage", "@id": "https://www.gdesapsom.com/beograd/kafici#page",
    "url": "https://www.gdesapsom.com/beograd/kafici",
    "name": "Pet friendly kafići u Beogradu – kafići u koje možete sa psom",
    "inLanguage": "sr-Latn", "dateModified": "2026-10-01",
    "mainEntity": { "@type": "ItemList", "numberOfItems": 87, "itemListOrder": "https://schema.org/ItemListUnordered",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "item": { "@type": "CafeOrCoffeeShop",
            "@id": "https://www.gdesapsom.com/mesto/primer-kafic-beograd#place",
            "name": "Primer kafić", "url": "https://www.gdesapsom.com/mesto/primer-kafic-beograd",
            "address": { "@type": "PostalAddress", "streetAddress": "Ulica 1", "addressLocality": "Beograd", "addressCountry": "RS" } } } ] } },
  { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://www.gdesapsom.com" },
      { "@type": "ListItem", "position": 2, "name": "Beograd", "item": "https://www.gdesapsom.com/beograd" },
      { "@type": "ListItem", "position": 3, "name": "Kafići", "item": "https://www.gdesapsom.com/beograd/kafici" } ] }
] }
```

Include the first page of items only (20), with `@id`s that match the place pages.

## 10.4 Restaurant / café / bar (`/mesto/{slug}`)

```json
{ "@context": "https://schema.org", "@graph": [
  { "@type": "Restaurant", "@id": "https://www.gdesapsom.com/mesto/primer-restoran-beograd#place",
    "name": "Primer restoran", "url": "https://www.gdesapsom.com/mesto/primer-restoran-beograd",
    "image": ["https://www.gdesapsom.com/img/mesta/primer-restoran-beograd-1.webp"],
    "description": "Pet friendly restoran na Vračaru: psi svih veličina dobrodošli u bašti i unutra, bez doplate.",
    "telephone": "+381111234567",
    "address": { "@type": "PostalAddress", "streetAddress": "Njegoševa 1", "addressLocality": "Beograd",
                 "addressRegion": "Vračar", "postalCode": "11000", "addressCountry": "RS" },
    "geo": { "@type": "GeoCoordinates", "latitude": 44.8036, "longitude": 20.4761 },
    "servesCuisine": "Srpska", "priceRange": "$$",
    "openingHoursSpecification": [
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"], "opens": "08:00", "closes": "23:00" },
      { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Saturday","Sunday"], "opens": "09:00", "closes": "00:00" } ],
    "amenityFeature": [
      { "@type": "LocationFeatureSpecification", "name": "Psi dozvoljeni", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Psi dozvoljeni unutra", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Bašta", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Posuda sa vodom za pse", "value": true },
      { "@type": "LocationFeatureSpecification", "name": "Dozvoljena veličina psa", "value": "Svi psi" } ],
    "sameAs": ["https://www.instagram.com/primerrestoran", "https://maps.google.com/?cid=123"],
    "isAccessibleForFree": true },
  { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://www.gdesapsom.com" },
      { "@type": "ListItem", "position": 2, "name": "Beograd", "item": "https://www.gdesapsom.com/beograd" },
      { "@type": "ListItem", "position": 3, "name": "Restorani", "item": "https://www.gdesapsom.com/beograd/restorani" },
      { "@type": "ListItem", "position": 4, "name": "Primer restoran" } ] },
  { "@type": "FAQPage", "mainEntity": [
      { "@type": "Question", "name": "Da li su psi dozvoljeni unutra u Primer restoranu?",
        "acceptedAnswer": { "@type": "Answer", "text": "Da, psi su dozvoljeni i u bašti i u unutrašnjem prostoru. Poslednja provera: 12. 9. 2026." } } ] }
] }
```

Use `CafeOrCoffeeShop` for Kafić/Kafeterija, `BarOrPub` for Bar/Pab, `FoodEstablishment` for Splav (as today). `Review`/`AggregateRating` are added only when there are real visitor reviews:

```json
"aggregateRating": { "@type": "AggregateRating", "ratingValue": 4.6, "reviewCount": 12 },
"review": [{ "@type": "Review", "author": { "@type": "Person", "name": "Jelena" }, "datePublished": "2026-09-12",
             "reviewRating": { "@type": "Rating", "ratingValue": 5 }, "reviewBody": "Bili smo sa labradorom u bašti…" }]
```

## 10.5 Hotel (`/mesto/{slug}`)

```json
{ "@context": "https://schema.org", "@type": "Hotel",
  "@id": "https://www.gdesapsom.com/mesto/primer-hotel-zlatibor#place",
  "name": "Primer hotel", "url": "https://www.gdesapsom.com/mesto/primer-hotel-zlatibor",
  "image": ["https://www.gdesapsom.com/img/mesta/primer-hotel-zlatibor-1.webp"],
  "petsAllowed": true,
  "address": { "@type": "PostalAddress", "streetAddress": "Miladina Pećinara 1", "addressLocality": "Zlatibor", "postalCode": "31315", "addressCountry": "RS" },
  "geo": { "@type": "GeoCoordinates", "latitude": 43.7294, "longitude": 19.7011 },
  "telephone": "+38131123456", "checkinTime": "14:00", "checkoutTime": "11:00", "starRating": { "@type": "Rating", "ratingValue": 4 },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Doplata za psa", "value": "1500 RSD po noći" },
    { "@type": "LocationFeatureSpecification", "name": "Maksimalna veličina psa", "value": "do 15 kg" },
    { "@type": "LocationFeatureSpecification", "name": "Psi u restoranu hotela", "value": false },
    { "@type": "LocationFeatureSpecification", "name": "Spa", "value": true } ],
  "sameAs": ["https://www.primerhotel.rs"] }
```

## 10.6 Apartment / holiday home

```json
{ "@context": "https://schema.org", "@type": "LodgingBusiness",
  "additionalType": "https://schema.org/VacationRental",
  "@id": "https://www.gdesapsom.com/mesto/vikendica-primer-tara#place",
  "name": "Vikendica Primer", "url": "https://www.gdesapsom.com/mesto/vikendica-primer-tara",
  "petsAllowed": true, "numberOfRooms": 2,
  "address": { "@type": "PostalAddress", "addressLocality": "Kaluđerske Bare", "addressRegion": "Tara", "addressCountry": "RS" },
  "geo": { "@type": "GeoCoordinates", "latitude": 43.9, "longitude": 19.5 },
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Ograđeno dvorište", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Doplata za psa", "value": "bez doplate" },
    { "@type": "LocationFeatureSpecification", "name": "Broj pasa", "value": "do 2" } ],
  "telephone": "+381641234567", "sameAs": ["https://www.booking.com/hotel/rs/primer.html"] }
```

## 10.7 Park (`/park/{slug}`)

```json
{ "@context": "https://schema.org", "@type": "Park",
  "@id": "https://www.gdesapsom.com/park/tasmajdan-beograd#place",
  "name": "Park za pse Tašmajdan", "url": "https://www.gdesapsom.com/park/tasmajdan-beograd",
  "image": ["https://www.gdesapsom.com/img/parkovi/tasmajdan-beograd-1.webp"],
  "address": { "@type": "PostalAddress", "streetAddress": "Tašmajdanski park", "addressLocality": "Beograd", "addressRegion": "Palilula", "addressCountry": "RS" },
  "geo": { "@type": "GeoCoordinates", "latitude": 44.8097, "longitude": 20.4717 },
  "isAccessibleForFree": true, "publicAccess": true,
  "openingHours": "Mo-Su 00:00-24:00",
  "amenityFeature": [
    { "@type": "LocationFeatureSpecification", "name": "Ograđen prostor", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Voda", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Osvetljenje", "value": true },
    { "@type": "LocationFeatureSpecification", "name": "Kante za otpad", "value": true } ] }
```

## 10.8 Veterinary clinic and pet shop

`VeterinaryCare` with `openingHoursSpecification`, `telephone`, `address`, `geo`, and an `amenityFeature` "Dežurstvo 24h" when true. Pet shops keep the existing `PetStore` block; add `image`, `openingHoursSpecification` and `hasOfferCatalog` only if offers are shown.

## 10.9 Destination page (`/zlatibor`)

```json
{ "@context": "https://schema.org", "@graph": [
  { "@type": "TouristDestination", "@id": "https://www.gdesapsom.com/zlatibor#destination",
    "name": "Zlatibor", "url": "https://www.gdesapsom.com/zlatibor",
    "description": "Vodič za boravak na Zlatiboru sa psom: smeštaj koji prima pse, restorani, šetnje i pravila.",
    "touristType": ["vlasnici pasa", "porodice sa ljubimcima"],
    "geo": { "@type": "GeoCoordinates", "latitude": 43.7294, "longitude": 19.7011 },
    "includesAttraction": [ { "@type": "TouristAttraction", "name": "Ribničko jezero" } ],
    "sameAs": "https://www.wikidata.org/wiki/Q1070329" },
  { "@type": "BreadcrumbList", "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Početna", "item": "https://www.gdesapsom.com" },
      { "@type": "ListItem", "position": 2, "name": "Zlatibor", "item": "https://www.gdesapsom.com/zlatibor" } ] }
] }
```

(Verify Wikidata IDs before use.)

## 10.10 Blog article

```json
{ "@context": "https://schema.org", "@type": "BlogPosting",
  "@id": "https://www.gdesapsom.com/blog/gde-setati-psa-u-beogradu#article",
  "mainEntityOfPage": "https://www.gdesapsom.com/blog/gde-setati-psa-u-beogradu",
  "headline": "Gde šetati psa u Beogradu: 15 najlepših mesta za šetnju",
  "image": ["https://www.gdesapsom.com/img/blog/gde-setati-psa-u-beogradu.webp"],
  "datePublished": "2026-10-10T08:00:00+02:00", "dateModified": "2026-10-10T08:00:00+02:00",
  "inLanguage": "sr-Latn",
  "author": { "@type": "Person", "name": "Ime Prezime", "url": "https://www.gdesapsom.com/autor/ime-prezime" },
  "publisher": { "@id": "https://www.gdesapsom.com/#org" },
  "articleSection": "Vodiči", "keywords": "šetnja sa psom, Beograd, parkovi za pse",
  "about": [ { "@type": "City", "name": "Beograd" } ],
  "mentions": [ { "@type": "Park", "@id": "https://www.gdesapsom.com/park/tasmajdan-beograd#place" } ] }
```

Keep the existing rule: posts authored by "Admin" are credited to the Organization; otherwise use a real `Person` with an author page.

## 10.11 Breadcrumbs

Every page below the homepage carries a `BreadcrumbList` matching the visible breadcrumb; the last item has no `item` URL. Patterns: `Početna › {Grad} › {Kategorija} › {Mesto}`, `Početna › {Destinacija} › Smeštaj`, `Početna › Blog › {Članak}`.

## 10.12 FAQ

Mark up only questions that are visible on the page, maximum 5 per page, answers under 300 characters. Google stopped showing FAQ rich results for non-government/health sites in 2023; the markup still helps disambiguation and costs nothing when generated from data.

## 10.13 Validation

- Add a Jest snapshot per template in `structured-data.spec.ts`.
- Run the Rich Results Test on one URL per template after each release; monitor GSC "Enhancements" reports (Breadcrumbs, FAQ, Product, Review snippets).
