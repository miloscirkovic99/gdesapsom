# 2. Keyword research and prioritization

## 2.1 Method and data caveats (read first)

- **Search volumes are marked "data unavailable" on every row.** No keyword tool (Google Keyword Planner, Ahrefs, Semrush) and no Google Autocomplete/Trends endpoint was reachable from the analysis environment, and inventing numbers would be worse than none. The CSV (`docs/seo/keywords.csv`) is built as a seed list: import it into Google Keyword Planner (country: Serbia, language: Serbian) to attach real monthly volumes, then re-sort. After 8–12 weeks, Google Search Console impressions become the better source anyway.
- **Competition** (Low / Medium / High) is a qualitative judgement of *who currently ranks*: High = Booking.com, Airbnb, Expedia, Hotels.com or strong national media; Medium = media listicles, planplus.rs, 021.rs, OTA long-tail; Low = no dedicated page found. **SEO difficulty** is the effort for GdeSaPsom specifically, given its current authority (new domain, few links) and the page we can build.
- **Priority:** P1 = build in the first 90 days, P2 = months 3–6, P3 = opportunistic / after data.
- **Phrasing evidence.** Serbian users type both the English loan phrase ("pet friendly kafići Beograd") and native forms ("kafići sa psom", "kafići u koje možete sa psom", "psi dozvoljeni", "hoteli koji primaju pse", "ljubimci dobrodošli"). Media and venues use "pet friendly" in titles; forum-style questions use "gde sa psom …" and "da li može pas …". Each recommended page must contain both the loan phrase and the native phrase naturally (title + H1 + intro), instead of creating one page per synonym.
- **Script and diacritics.** Searches are typed overwhelmingly in Latin script, usually without diacritics ("kafici", "setnja"). Google normalises diacritics for Serbian, so write page content with correct diacritics (kafići, šetnja) and keep URL slugs ASCII-only (`/beograd/kafici`). Cyrillic queries ("где са псом") are matched by Google's transliteration; a Cyrillic `alternateName` in the Organization schema is enough.
- "Local" intent here means a geo-modified query where the user wants a list of places to visit; "Transactional" means an immediate action (near-me, book, call); "Commercial investigation" means comparing options before a decision (accommodation almost always falls here).

## 2.2 Keyword clusters (full list)

The same data is in `keywords.csv` for sorting and import.

Total keywords: **199** in 16 clusters. By intent: Navigational 6, Local 71, Transactional 5, Informational 59, Commercial investigation 58. By priority: P1 59, P2 78, P3 62.

### Cluster: Brand (6)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| gde sa psom | Navigational | Srbija | data unavailable | Low | Low | P1 | `/` | Brand query and the natural Serbian question. kudasapsom.com (a hiking blog) appears next to the site - brand-confusion risk; homepage title must carry the phrase. |
| gdesapsom | Navigational | Srbija | data unavailable | Low | Low | P1 | `/` | Brand misspelling / domain typed as a word. |
| gde sa psom aplikacija | Navigational | Srbija | data unavailable | Low | Low | P2 | `/aplikacija` | Android app + PWA page; link to Google Play. |
| gde sa psom beograd | Navigational | Beograd | data unavailable | Low | Low | P1 | `/beograd` | Brand + city; the city hub answers it. |
| gde sa psom blog | Navigational | Srbija | data unavailable | Low | Low | P3 | `/blog` |  |
| dodaj pet friendly lokaciju | Navigational | Srbija | data unavailable | Low | Low | P3 | `/dodaj-lokaciju` | Contribution intent; keep crawlable but noindex is acceptable. |

### Cluster: Pet friendly Srbija (16)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly srbija | Local | Srbija | data unavailable | Medium | Medium | P1 | `/` | Core generic term; homepage + category hubs. Competition from booking platforms and media. |
| pet friendly mesta srbija | Local | Srbija | data unavailable | Medium | Medium | P1 | `/mesta` | All-places page needs an editorial intro and city links. |
| pet friendly mesta u blizini | Transactional | Srbija | data unavailable | Low | Low | P2 | `/u-blizini` | GPS near-me page; index only with real explanatory content. |
| pet friendly lokacije | Local | Srbija | data unavailable | Low | Low | P2 | `/mesta` | Synonym of 'mesta'; same page. |
| pet friendly objekti | Local | Srbija | data unavailable | Low | Low | P3 | `/mesta` | Formal wording used by venues and media. |
| pet friendly mapa srbija | Local | Srbija | data unavailable | Low | Low | P2 | `/mapa` | Map page with all places; strong link magnet. |
| psi dozvoljeni | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/gde-su-psi-dozvoljeni-u-srbiji-pravila` | Native phrasing ('psi dozvoljeni'); guide on rules + links to categories. |
| ljubimci dobrodosli | Informational | Beograd | data unavailable | Low | Low | P2 | `/blog/ljubimci-dobrodosli-nalepnica-beograd` | Name of the Belgrade sticker campaign (verified in media). Guide + directory CTA. |
| pet friendly beograd | Local | Beograd | data unavailable | Medium | Medium | P1 | `/beograd` | City hub. Media listicles compete; a maintained directory can win. |
| pet friendly novi sad | Local | Novi Sad | data unavailable | Medium | Medium | P1 | `/novi-sad` | pet-friendly.rs (community map, ~138 venues reported) and media lists (mojnovisad, eventuj, nsuzivo) exist; none has crawlable structured venue pages. |
| pet friendly nis | Local | Niš | data unavailable | Low | Low | P2 | `/nis` |  |
| pet friendly kragujevac | Local | Kragujevac | data unavailable | Low | Low | P3 | `/kragujevac` | Create only when the city has enough listings. |
| pet friendly subotica | Local | Subotica | data unavailable | Low | Low | P3 | `/subotica` |  |
| pet friendly zemun | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/zemun` | Township hub, threshold-based. |
| pet friendly pancevo | Local | Pančevo | data unavailable | Low | Low | P3 | `/pancevo` |  |
| pet friendly cacak | Local | Čačak | data unavailable | Low | Low | P3 | `/cacak` |  |

### Cluster: Dog friendly (EN) (6)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| dog friendly belgrade | Local | Beograd (EN) | data unavailable | Medium | Medium | P2 | `/en/belgrade` | Foreign visitors; BringFido/Expedia compete. Needs the /en mirror with hreflang. |
| dog friendly restaurants belgrade | Local | Beograd (EN) | data unavailable | Medium | Medium | P2 | `/en/belgrade/restaurants` |  |
| dog friendly cafes belgrade | Local | Beograd (EN) | data unavailable | Low | Medium | P3 | `/en/belgrade/cafes` |  |
| pet friendly hotels belgrade | Commercial investigation | Beograd (EN) | data unavailable | High | High | P3 | `/en/belgrade/hotels` | Booking/Expedia/Hotels.com own this SERP. |
| dog friendly serbia | Informational | Srbija (EN) | data unavailable | Medium | Medium | P3 | `/en` |  |
| dog parks belgrade | Local | Beograd (EN) | data unavailable | Low | Low | P3 | `/en/belgrade/dog-parks` |  |

### Cluster: Restorani (17)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly restorani beograd | Local | Beograd | data unavailable | Medium | Medium | P1 | `/beograd/restorani` | Primary money page for Belgrade dining. |
| restorani u koje mozete sa psom beograd | Local | Beograd | data unavailable | Low | Low | P1 | `/beograd/restorani` | Natural long phrasing; use in H2/intro, not a separate page. |
| restoran sa psom beograd | Local | Beograd | data unavailable | Low | Low | P1 | `/beograd/restorani` |  |
| restorani gde su psi dozvoljeni beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/restorani` |  |
| restorani sa bastom za pse beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/restorani` | Garden attribute: a filter and an H2 section, not a separate URL (until data shows demand). |
| restoran pas dozvoljen unutra beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/restorani` | Requires the new 'dogs allowed indoors' attribute. |
| pet friendly restorani novi sad | Local | Novi Sad | data unavailable | Low | Low | P1 | `/novi-sad/restorani` |  |
| restoran sa psom novi sad | Local | Novi Sad | data unavailable | Low | Low | P2 | `/novi-sad/restorani` |  |
| pet friendly restorani nis | Local | Niš | data unavailable | Low | Low | P2 | `/nis/restorani` | Only generic directory tag pages (381info.com) and one restaurant surfaced - open field. |
| pet friendly restorani zlatibor | Local | Zlatibor | data unavailable | Low | Low | P2 | `/zlatibor/restorani` |  |
| pet friendly restorani srbija | Local | Srbija | data unavailable | Low | Medium | P2 | `/restorani` | National category hub linking to each city page. |
| pet friendly restorani vracar | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/vracar/restorani` | Township x category, create only above the listing threshold. |
| pet friendly restorani novi beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/novi-beograd/restorani` |  |
| pet friendly restorani zemun | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/zemun/restorani` |  |
| pet friendly splavovi beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/splavovi` | 'Splav' is an existing place type unique to Belgrade; nobody targets it. |
| splav sa psom beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/splavovi` |  |
| pet friendly restorani kragujevac | Local | Kragujevac | data unavailable | Low | Low | P3 | `/kragujevac/restorani` |  |

### Cluster: Kafici (17)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly kafici beograd | Local | Beograd | data unavailable | Medium | Medium | P1 | `/beograd/kafici` | Highest-intent city dining query; media listicles are the main competition. |
| kafici sa psom beograd | Local | Beograd | data unavailable | Low | Low | P1 | `/beograd/kafici` | Native phrasing; same page. |
| kafici u koje mozete sa psom beograd | Local | Beograd | data unavailable | Low | Low | P1 | `/beograd/kafici` | Verified natural phrasing in search results. |
| kafic pet friendly beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/kafici` |  |
| kafici gde su psi dozvoljeni beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/kafici` |  |
| pet friendly kafici novi sad | Local | Novi Sad | data unavailable | Low | Low | P1 | `/novi-sad/kafici` |  |
| kafici sa psom novi sad | Local | Novi Sad | data unavailable | Low | Low | P2 | `/novi-sad/kafici` |  |
| pet friendly kafici nis | Local | Niš | data unavailable | Low | Low | P2 | `/nis/kafici` |  |
| pet friendly kafici vracar | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/vracar/kafici` | Township page; threshold-based. |
| pet friendly kafici dorcol | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/stari-grad/kafici` | Dorćol is a neighbourhood inside Stari grad; mention neighbourhoods in the township page copy. |
| pet friendly kafici zemun | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/zemun/kafici` |  |
| pet friendly kafici novi beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/novi-beograd/kafici` |  |
| pet friendly barovi beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/barovi` | Bar + Pab types merged into one page. |
| pab sa psom beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/barovi` |  |
| kafici sa psom zlatibor | Local | Zlatibor | data unavailable | Low | Low | P2 | `/zlatibor/kafici` |  |
| kafic sa psom u blizini | Transactional | Srbija | data unavailable | Low | Low | P2 | `/u-blizini` | Near-me feature; also surfaced by city pages. |
| dog friendly cafe beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/kafici` | Mixed-language query from locals; covered by the Serbian page. |

### Cluster: Hoteli (14)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly hoteli srbija | Commercial investigation | Srbija | data unavailable | High | High | P1 | `/hoteli` | Booking.com and OTA pages dominate; win with completeness and dog-specific facts (fee, size, indoor). |
| pet friendly hotel beograd | Commercial investigation | Beograd | data unavailable | High | High | P1 | `/beograd/hoteli` |  |
| hoteli koji primaju pse beograd | Commercial investigation | Beograd | data unavailable | Medium | Medium | P1 | `/beograd/hoteli` | Native phrasing with less OTA competition. |
| hotel sa psom beograd | Commercial investigation | Beograd | data unavailable | Medium | Medium | P2 | `/beograd/hoteli` |  |
| pet friendly hoteli zlatibor | Commercial investigation | Zlatibor | data unavailable | High | High | P1 | `/zlatibor/hoteli` | Verified SERP: Booking, Airbnb, Skyscanner, Hotels.com. |
| hoteli koji primaju pse zlatibor | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P1 | `/zlatibor/hoteli` |  |
| pet friendly hoteli kopaonik | Commercial investigation | Kopaonik | data unavailable | High | High | P1 | `/kopaonik/hoteli` | Viceroy and Grey publish pet policies; aggregate them with fees. |
| pet friendly hotel novi sad | Commercial investigation | Novi Sad | data unavailable | High | High | P2 | `/novi-sad/hoteli` |  |
| pet friendly hoteli vrnjacka banja | Commercial investigation | Vrnjačka Banja | data unavailable | Medium | Medium | P2 | `/vrnjacka-banja/hoteli` |  |
| pet friendly hoteli nis | Commercial investigation | Niš | data unavailable | Medium | Medium | P3 | `/nis/hoteli` |  |
| pet friendly hoteli tara | Commercial investigation | Tara | data unavailable | Medium | Medium | P2 | `/tara/hoteli` |  |
| pet friendly hotel divcibare | Commercial investigation | Divčibare | data unavailable | Medium | Medium | P2 | `/divcibare/hoteli` |  |
| pet friendly hotel sa spa srbija | Commercial investigation | Srbija | data unavailable | Medium | Medium | P3 | `/blog/pet-friendly-spa-hoteli-srbija` | Article listing wellness hotels that accept dogs; links to hotel pages. |
| hotel dozvoljeni psi srbija | Commercial investigation | Srbija | data unavailable | Medium | Medium | P3 | `/hoteli` |  |

### Cluster: Apartmani (12)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly apartmani zlatibor | Commercial investigation | Zlatibor | data unavailable | High | Medium | P1 | `/zlatibor/apartmani` | High demand destination; apartment portals + Airbnb compete, but none is dog-specific. |
| apartmani zlatibor psi dozvoljeni | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P1 | `/zlatibor/apartmani` |  |
| apartmani sa psom zlatibor | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P2 | `/zlatibor/apartmani` |  |
| pet friendly apartmani kopaonik | Commercial investigation | Kopaonik | data unavailable | High | Medium | P1 | `/kopaonik/apartmani` |  |
| apartmani kopaonik psi dozvoljeni | Commercial investigation | Kopaonik | data unavailable | Medium | Medium | P2 | `/kopaonik/apartmani` |  |
| pet friendly apartmani beograd | Commercial investigation | Beograd | data unavailable | High | High | P2 | `/beograd/apartmani` | Airbnb/Booking own it; keep as a supporting page. |
| pet friendly apartmani novi sad | Commercial investigation | Novi Sad | data unavailable | Medium | Medium | P2 | `/novi-sad/apartmani` |  |
| pet friendly apartmani vrnjacka banja | Commercial investigation | Vrnjačka Banja | data unavailable | Medium | Medium | P1 | `/vrnjacka-banja/apartmani` | Apartment-heavy destination; verified listings exist but no dedicated dog page. |
| apartmani divcibare pet friendly | Commercial investigation | Divčibare | data unavailable | Medium | Medium | P2 | `/divcibare/apartmani` |  |
| apartmani tara psi dozvoljeni | Commercial investigation | Tara | data unavailable | Medium | Medium | P2 | `/tara/apartmani` |  |
| apartmani sokobanja pet friendly | Commercial investigation | Sokobanja | data unavailable | Medium | Medium | P3 | `/sokobanja/apartmani` |  |
| pet friendly apartmani srbija | Commercial investigation | Srbija | data unavailable | Medium | Medium | P2 | `/apartmani` |  |

### Cluster: Vikendice (12)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| vikendice pet friendly srbija | Commercial investigation | Srbija | data unavailable | Medium | Medium | P1 | `/vikendice` | New category; facet pages exist on selo.rs, topsmestaj.com, weekendica.com and a journal.rs article, but none is dog-specific (fee, fenced yard, size). |
| vikendica sa psom | Commercial investigation | Srbija | data unavailable | Medium | Medium | P1 | `/vikendice` |  |
| vikendice za izdavanje psi dozvoljeni | Commercial investigation | Srbija | data unavailable | Medium | Medium | P2 | `/vikendice` |  |
| vikendica tara pet friendly | Commercial investigation | Tara | data unavailable | Medium | Medium | P1 | `/tara/vikendice` | Verified: several pet-friendly vikendice on OTAs (Mila house, Thalia). |
| vikendica divcibare pet friendly | Commercial investigation | Divčibare | data unavailable | Medium | Medium | P1 | `/divcibare/vikendice` | Verified: Nadja, Nensy, Marković, Brvnara Gaj on OTAs. |
| vikendica zlatibor pet friendly | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P2 | `/zlatibor/vikendice` |  |
| vikendica fruska gora sa psom | Commercial investigation | Fruška gora | data unavailable | Low | Low | P2 | `/fruska-gora/vikendice` |  |
| vikendica sa ogradjenim dvoristem za psa | Commercial investigation | Srbija | data unavailable | Low | Low | P2 | `/vikendice` | Attribute 'fenced yard' - add it to the data model and the filter. |
| seosko domacinstvo pet friendly | Commercial investigation | Srbija | data unavailable | Low | Low | P2 | `/seoska-domacinstva` | Future category: rural households (seoski turizam) are very dog-tolerant. |
| brvnara pet friendly srbija | Commercial investigation | Srbija | data unavailable | Low | Low | P3 | `/vikendice` |  |
| kuca za odmor sa psom srbija | Commercial investigation | Srbija | data unavailable | Low | Low | P2 | `/vikendice` |  |
| etno selo pet friendly | Commercial investigation | Srbija | data unavailable | Low | Low | P3 | `/blog/etno-sela-pet-friendly-srbija` | Article; links to place pages. |

### Cluster: Smestaj (16)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| pet friendly smestaj zlatibor | Commercial investigation | Zlatibor | data unavailable | High | Medium | P1 | `/zlatibor/smestaj` | The single most valuable destination page: hotels + apartments + holiday homes together. |
| smestaj zlatibor sa psom | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P1 | `/zlatibor/smestaj` |  |
| smestaj sa psom zlatibor cene | Commercial investigation | Zlatibor | data unavailable | Medium | Medium | P2 | `/zlatibor/smestaj` | Show dog fee and price range on cards. |
| pet friendly smestaj kopaonik | Commercial investigation | Kopaonik | data unavailable | High | Medium | P1 | `/kopaonik/smestaj` | Winter peak (Dec-Mar). |
| pet friendly smestaj tara | Commercial investigation | Tara | data unavailable | High | Medium | P1 | `/tara/smestaj` | tara.rs reports 100+ pet-friendly objects and Booking has a Tara region page; differentiate with dog rules and venues around the stay. |
| pet friendly smestaj divcibare | Commercial investigation | Divčibare | data unavailable | Medium | Medium | P1 | `/divcibare/smestaj` |  |
| pet friendly smestaj vrnjacka banja | Commercial investigation | Vrnjačka Banja | data unavailable | Medium | Medium | P1 | `/vrnjacka-banja/smestaj` |  |
| pet friendly smestaj srbija | Commercial investigation | Srbija | data unavailable | High | Medium | P1 | `/smestaj` | National accommodation hub. |
| smestaj koji prima pse | Commercial investigation | Srbija | data unavailable | Medium | Medium | P1 | `/smestaj` | Native phrasing; same page. |
| pet friendly smestaj sokobanja | Commercial investigation | Sokobanja | data unavailable | Medium | Medium | P2 | `/sokobanja/smestaj` |  |
| pet friendly smestaj palic | Commercial investigation | Palić | data unavailable | Low | Low | P2 | `/palic/smestaj` |  |
| pet friendly smestaj zlatar | Commercial investigation | Zlatar | data unavailable | Low | Low | P3 | `/zlatar/smestaj` |  |
| pet friendly smestaj stara planina | Commercial investigation | Stara planina | data unavailable | Low | Low | P3 | `/stara-planina/smestaj` |  |
| pet friendly smestaj rtanj | Commercial investigation | Rtanj | data unavailable | Low | Low | P3 | `/rtanj/smestaj` |  |
| pet friendly smestaj golija | Commercial investigation | Golija | data unavailable | Low | Low | P3 | `/golija/smestaj` |  |
| vikend sa psom blizu beograda smestaj | Commercial investigation | Beograd okolina | data unavailable | Low | Low | P1 | `/blog/vikend-sa-psom-blizu-beograda` | Article + links to Fruška gora / Divčibare / Tara pages. |

### Cluster: Parkovi (15)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| parkovi za pse beograd | Local | Beograd | data unavailable | Medium | Medium | P1 | `/beograd/parkovi-za-pse` | Partial lists exist (tob.rs pet-parkovi page, planplus.rs dog-parks category, petfriendlysrbija.rs, news); none is complete, geolocated and maintained with attributes. |
| park za pse u blizini | Transactional | Srbija | data unavailable | Low | Low | P2 | `/u-blizini` |  |
| ogradjeni parkovi za pse beograd | Local | Beograd | data unavailable | Low | Low | P1 | `/beograd/parkovi-za-pse` | Verified phrasing in media ('ograđen prostor za pse'). |
| park za pse novi beograd | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/parkovi-za-pse` | Township sections on the city parks page (H2 per opština). |
| park za pse vracar | Local | Beograd | data unavailable | Low | Low | P2 | `/beograd/parkovi-za-pse` |  |
| park za pse zvezdara | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/parkovi-za-pse` |  |
| park za pse zemun | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/parkovi-za-pse` |  |
| parkovi za pse novi sad | Local | Novi Sad | data unavailable | Low | Low | P1 | `/novi-sad/parkovi-za-pse` |  |
| park za pse nis | Local | Niš | data unavailable | Low | Low | P2 | `/nis/parkovi-za-pse` |  |
| park za pse kragujevac | Local | Kragujevac | data unavailable | Low | Low | P3 | `/kragujevac/parkovi-za-pse` |  |
| park za pse tasmajdan | Local | Beograd | data unavailable | Low | Low | P2 | `/park/tasmajdan-beograd` | Named park page; Tašmajdan is the best-known fenced park (verified in media). |
| ada ciganlija psi | Informational | Beograd | data unavailable | Medium | Medium | P2 | `/blog/ada-ciganlija-sa-psom-pravila` | Rules for dogs on Ada; links to the nearest parks and cafes. |
| pravila u parku za pse | Informational | Srbija | data unavailable | Low | Low | P3 | `/blog/pravila-ponasanja-park-za-pse` | Existing 13 rules can become an article with schema. |
| gde pustiti psa sa povoca beograd | Informational | Beograd | data unavailable | Low | Low | P2 | `/blog/gde-pustiti-psa-sa-povoca-beograd` | Leash-free areas; strong link to the parks page. |
| povrsina za pse beograd | Local | Beograd | data unavailable | Low | Low | P3 | `/beograd/parkovi-za-pse` | Official municipal wording; include as synonym. |

### Cluster: Aktivnosti (12)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| gde setati psa u beogradu | Informational | Beograd | data unavailable | Medium | Medium | P1 | `/blog/gde-setati-psa-u-beogradu` | Top-of-funnel for Belgrade; links to parks, Ada, Košutnjak, cafes. |
| najlepsa mesta za setnju sa psom beograd | Informational | Beograd | data unavailable | Low | Low | P1 | `/blog/gde-setati-psa-u-beogradu` | Same article. |
| setnja sa psom novi sad | Informational | Novi Sad | data unavailable | Low | Low | P2 | `/blog/setnja-sa-psom-novi-sad` |  |
| planinarenje sa psom srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/planinarenje-sa-psom-srbija` | Links to Tara, Fruška gora, Stara planina destination pages. |
| izlet sa psom beograd okolina | Informational | Beograd okolina | data unavailable | Medium | Medium | P1 | `/blog/izleti-sa-psom-iz-beograda` | Day trips: Avala, Kosmaj, Fruška gora, Oplenac. kudasapsom.com and journal.rs already rank; add verified cafés and parks per trip. |
| plaza za pse srbija | Informational | Srbija | data unavailable | Medium | Medium | P2 | `/blog/plaze-i-jezera-za-pse-srbija` | turizamarriva.rs has a top-10 article; the opportunity is a maintained, mapped version with rules per lake. |
| kupanje psa jezero srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/plaze-i-jezera-za-pse-srbija` |  |
| kosutnjak sa psom | Informational | Beograd | data unavailable | Low | Low | P3 | `/blog/gde-setati-psa-u-beogradu` |  |
| fruska gora sa psom | Informational | Fruška gora | data unavailable | Low | Low | P2 | `/fruska-gora` | Destination hub + guide. |
| avala sa psom | Informational | Beograd okolina | data unavailable | Low | Low | P3 | `/blog/izleti-sa-psom-iz-beograda` |  |
| tara planinarenje sa psom | Informational | Tara | data unavailable | Low | Low | P3 | `/tara` |  |
| pet friendly plaza srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/plaze-i-jezera-za-pse-srbija` |  |

### Cluster: Putovanja (17)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| putovanje sa psom | Informational | Srbija | data unavailable | High | Medium | P1 | `/blog/putovanje-sa-psom-vodic` | Pillar guide; Croatian travel sites and petfriendlyhoteli.com dominate the plain query - target the Serbian-specific angles (documents, borders, domestic transport). |
| putovanje sa psom automobilom | Informational | Srbija | data unavailable | Medium | Medium | P2 | `/blog/putovanje-sa-psom-automobilom` |  |
| putovanje sa psom autobusom srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/pas-u-autobusu-srbija-pravila` | Carrier rules (Lasta, FlixBus, local lines). |
| pas u vozu srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/pas-u-vozu-srbija-pravila` | Srbijavoz rules. |
| pas u gradskom prevozu beograd | Informational | Beograd | data unavailable | Medium | Low | P1 | `/blog/pas-u-gradskom-prevozu-beograd` | Verified real topic (GSP rules: carrier, 40 cm, time windows). |
| pasos za psa cena | Informational | Srbija | data unavailable | Medium | Medium | P2 | `/blog/pasos-za-psa-srbija` | Vet-blog competition; our angle is 'before the trip' + destination links. |
| putovanje sa psom u grcku iz srbije | Informational | Srbija | data unavailable | Medium | Medium | P1 | `/blog/putovanje-sa-psom-u-grcku` | Summer peak; EU entry rules; existing EU-rules post should link here. |
| sa psom na more iz srbije | Informational | Srbija | data unavailable | Medium | Medium | P1 | `/blog/sa-psom-na-more` | Hub article for Greece / Montenegro / Croatia. |
| putovanje sa psom u crnu goru | Informational | Srbija | data unavailable | Medium | Medium | P1 | `/blog/putovanje-sa-psom-u-crnu-goru` |  |
| putovanje sa psom u hrvatsku | Informational | Srbija | data unavailable | Medium | Medium | P2 | `/blog/putovanje-sa-psom-u-hrvatsku` |  |
| pas u avionu air serbia | Informational | Srbija | data unavailable | Medium | Medium | P2 | `/blog/pas-u-avionu-air-serbia` |  |
| pet friendly plaze crna gora | Informational | Crna Gora | data unavailable | Medium | Medium | P2 | `/blog/pet-friendly-plaze-crna-gora` | 021.rs has a similar article (verified); differentiate with yearly updates. |
| gde sa psom za vikend | Informational | Srbija | data unavailable | Medium | Medium | P1 | `/blog/gde-sa-psom-za-vikend` | Evergreen; journal.rs and kudasapsom.com cover nearby trips from Belgrade - differentiate with verified venues per destination. |
| gde sa psom za prvi maj | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/gde-sa-psom-za-prvi-maj-srbija` | Existing post - refresh yearly. |
| gde sa psom za novu godinu | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/nova-godina-sa-psom-srbija` | Seasonal (Nov-Dec). |
| zimovanje sa psom srbija | Informational | Srbija | data unavailable | Low | Low | P2 | `/blog/zimovanje-sa-psom-srbija` | Kopaonik, Zlatibor, Stara planina. |
| letovanje sa psom | Informational | Srbija | data unavailable | Medium | Medium | P1 | `/blog/sa-psom-na-more` |  |

### Cluster: Destinacije (14)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| zlatibor sa psom | Informational | Zlatibor | data unavailable | Low | Low | P1 | `/zlatibor` | Destination hub 'Gde sa psom na Zlatiboru' + guide. |
| gde sa psom na zlatibor | Informational | Zlatibor | data unavailable | Low | Low | P1 | `/zlatibor` |  |
| kopaonik sa psom | Informational | Kopaonik | data unavailable | Low | Low | P1 | `/kopaonik` |  |
| tara sa psom | Informational | Tara | data unavailable | Low | Low | P1 | `/tara` |  |
| divcibare sa psom | Informational | Divčibare | data unavailable | Low | Low | P1 | `/divcibare` |  |
| vrnjacka banja sa psom | Informational | Vrnjačka Banja | data unavailable | Low | Low | P1 | `/vrnjacka-banja` |  |
| sokobanja sa psom | Informational | Sokobanja | data unavailable | Low | Low | P2 | `/sokobanja` |  |
| palic sa psom | Informational | Palić | data unavailable | Low | Low | P2 | `/palic` |  |
| zlatar sa psom | Informational | Zlatar | data unavailable | Low | Low | P3 | `/zlatar` |  |
| stara planina sa psom | Informational | Stara planina | data unavailable | Low | Low | P3 | `/stara-planina` |  |
| uvac sa psom | Informational | Uvac | data unavailable | Low | Low | P3 | `/blog/uvac-sa-psom` |  |
| djerdap sa psom | Informational | Đerdap | data unavailable | Low | Low | P3 | `/blog/djerdap-sa-psom` |  |
| rtanj sa psom | Informational | Rtanj | data unavailable | Low | Low | P3 | `/rtanj` |  |
| sremski karlovci sa psom | Informational | Sremski Karlovci | data unavailable | Low | Low | P3 | `/blog/sremski-karlovci-sa-psom` |  |

### Cluster: Gradovi (7)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| gde sa psom u beogradu | Informational | Beograd | data unavailable | Low | Low | P1 | `/beograd` | The exact question the brand answers; city hub H1. |
| gde sa psom u novom sadu | Informational | Novi Sad | data unavailable | Low | Low | P1 | `/novi-sad` |  |
| gde sa psom u nisu | Informational | Niš | data unavailable | Low | Low | P2 | `/nis` |  |
| gde sa psom u kragujevcu | Informational | Kragujevac | data unavailable | Low | Low | P3 | `/kragujevac` |  |
| gde sa psom u subotici | Informational | Subotica | data unavailable | Low | Low | P3 | `/subotica` |  |
| gde sa psom u zemunu | Informational | Beograd | data unavailable | Low | Low | P3 | `/beograd/zemun` |  |
| sta raditi sa psom u beogradu | Informational | Beograd | data unavailable | Low | Low | P2 | `/blog/sta-raditi-sa-psom-u-beogradu` | Activity angle; links to all Belgrade category pages. |

### Cluster: Veterinari i usluge (14)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| veterinar beograd | Local | Beograd | data unavailable | High | High | P2 | `/beograd/veterinari` | Vet directories and Google Maps dominate; supporting page, not a growth driver. |
| veterinarska ambulanta u blizini | Transactional | Srbija | data unavailable | High | High | P3 | `/u-blizini` |  |
| dezurni veterinar beograd 24h | Local | Beograd | data unavailable | Medium | Medium | P2 | `/beograd/veterinari` | Add an 'emergency / non-stop' attribute and section. |
| veterinar novi sad | Local | Novi Sad | data unavailable | High | High | P3 | `/novi-sad/veterinari` |  |
| veterinar nis | Local | Niš | data unavailable | Medium | Medium | P3 | `/nis/veterinari` |  |
| pet shop beograd | Local | Beograd | data unavailable | High | High | P2 | `/beograd/pet-shopovi` |  |
| pet shop u blizini | Transactional | Srbija | data unavailable | High | High | P3 | `/u-blizini` |  |
| pet shop novi sad | Local | Novi Sad | data unavailable | Medium | Medium | P3 | `/novi-sad/pet-shopovi` |  |
| hrana za pse cene | Commercial investigation | Srbija | data unavailable | High | High | P2 | `/hrana-za-pse` | Existing catalogue; compare prices across shops. |
| hrana za pse akcija | Commercial investigation | Srbija | data unavailable | High | High | P3 | `/hrana-za-pse` |  |
| pansion za pse beograd | Local | Beograd | data unavailable | Medium | Medium | P2 | `/beograd/pansioni-za-pse` | Future category; travellers who cannot take the dog need it - natural fit. |
| cuvanje pasa beograd | Local | Beograd | data unavailable | Medium | Medium | P2 | `/beograd/pansioni-za-pse` |  |
| frizer za pse beograd | Local | Beograd | data unavailable | Medium | Medium | P3 | `/beograd/frizeri-za-pse` | Future category. |
| skola za pse beograd | Local | Beograd | data unavailable | Medium | Medium | P3 | `/beograd/skole-za-pse` | Future category. |

### Cluster: Za biznise (4)

| Keyword | Search intent | Location | Estimated search volume | Competition | SEO difficulty | Priority | Recommended page | Notes |
|---|---|---|---|---|---|---|---|---|
| kako postati pet friendly kafic | Informational | Srbija | data unavailable | Low | Low | P3 | `/za-biznise` | B2B guide; converts venues into listings. |
| pet friendly nalepnica | Informational | Srbija | data unavailable | Low | Low | P3 | `/za-biznise` | Offer a downloadable 'Psi dobrodošli' badge. |
| pet friendly sertifikat srbija | Informational | Srbija | data unavailable | Low | Low | P3 | `/za-biznise` |  |
| oglasavanje pet friendly objekta | Commercial investigation | Srbija | data unavailable | Low | Low | P3 | `/za-biznise` |  |

## 2.3 Prioritization

Ranking logic: (1) does the query map to a page the directory can genuinely satisfy with existing or soon-to-exist listings, (2) is the SERP winnable for a young domain (native phrasing, no OTA dominance), (3) does it feed the conversion we care about (people opening and adding places), (4) seasonality against the 90-day window (October–December: Kopaonik, Zlatibor, Nova godina).

### 20 primary keywords and why each matters

| # | Keyword | Why it matters |
|---|---|---|
| 1 | gde sa psom | The brand *is* the question. Winning it protects brand traffic and every "gde sa psom u/na …" variant extends from it. |
| 2 | gde sa psom u beogradu | The exact question for the biggest city; it becomes the H1 of the Belgrade hub and the anchor of all Belgrade internal links. |
| 3 | pet friendly beograd | Umbrella term for Belgrade; media listicles rank today but go stale; a maintained hub with counts, map and townships beats them over time. |
| 4 | pet friendly kafići beograd | Highest-intent dining query; the directory already holds the most listings in this category and city. |
| 5 | kafići sa psom beograd | Native phrasing of #4; same page, second title/H2 variant. Low competition. |
| 6 | pet friendly restorani beograd | Second dining category; same mechanics as cafés, more "evening/ family" intent. |
| 7 | parkovi za pse beograd | Partial lists exist (TOB's pet-parks page, planplus.rs, petfriendlysrbija.rs, news), but no complete, geolocated, maintained list with attributes. Moderate competition, high link-worthiness, and parks link naturally to nearby cafés. |
| 8 | pet friendly novi sad | Second city; the community map pet-friendly.rs and media listicles exist, but no crawlable structured venue pages. Credit the community and publish the structured version. |
| 9 | pet friendly kafići novi sad | Same as #8 at category level. |
| 10 | pet friendly smeštaj zlatibor | The most valuable destination page: accommodation decisions, high commercial value, strong fit for partner/affiliate links later. |
| 11 | pet friendly apartmani zlatibor | Apartments dominate Zlatibor; OTAs rank but none is dog-specific (fee, size limits, fenced yard). |
| 12 | pet friendly smeštaj kopaonik | Ski season starts in December, inside the 90-day window. |
| 13 | pet friendly smeštaj tara | Holiday-home destination with thin OTA coverage; native "vikendica" supply is largely offline. |
| 14 | pet friendly smeštaj divčibare | Same profile as Tara, close to Belgrade (weekend trips). |
| 15 | pet friendly smeštaj vrnjačka banja | Spa destination with large apartment supply and year-round demand. |
| 16 | pet friendly hoteli srbija | The national hub term; hard, but it defines the category and collects links from every hotel page. |
| 17 | vikendica sa psom / vikendice pet friendly srbija | Accommodation portals have a yes/no "pet friendly" facet, but no site owns the dog-specific version (fee, fenced yard, size); adding "Vikendica" as a place type unlocks it. |
| 18 | gde sa psom za vikend | Evergreen informational query that feeds every destination page; the directory's core promise in one sentence. |
| 19 | putovanje sa psom | Pillar guide that anchors the travel cluster (documents, transport, border rules) and earns links. |
| 20 | sa psom na more / letovanje sa psom | The largest seasonal informational topic for Serbian dog owners (Greece, Montenegro, Croatia); it builds the audience that later searches domestic destinations. |

### 30 secondary keywords

hoteli koji primaju pse beograd · pet friendly hotel beograd · pet friendly hoteli zlatibor · hoteli koji primaju pse zlatibor · pet friendly hoteli kopaonik · pet friendly apartmani kopaonik · pet friendly apartmani vrnjačka banja · vikendica tara pet friendly · vikendica divčibare pet friendly · pet friendly smeštaj srbija · smeštaj koji prima pse · pet friendly restorani novi sad · pet friendly restorani niš · pet friendly kafići niš · pet friendly niš · gde sa psom u novom sadu · pet friendly splavovi beograd · pet friendly barovi beograd · ograđeni parkovi za pse beograd · parkovi za pse novi sad · zlatibor sa psom · kopaonik sa psom · tara sa psom · divčibare sa psom · vrnjačka banja sa psom · gde šetati psa u beogradu · izlet sa psom beograd okolina · pas u gradskom prevozu beograd · putovanje sa psom u grčku iz srbije · putovanje sa psom u crnu goru

### 50 long-tail keywords

restorani u koje možete sa psom beograd · kafići u koje možete sa psom beograd · kafići gde su psi dozvoljeni beograd · restorani gde su psi dozvoljeni beograd · restorani sa baštom za pse beograd · restoran pas dozvoljen unutra beograd · pet friendly kafići vračar · pet friendly kafići dorćol · pet friendly kafići zemun · pet friendly kafići novi beograd · pet friendly restorani vračar · pet friendly restorani novi beograd · pet friendly restorani zemun · splav sa psom beograd · pab sa psom beograd · kafići sa psom novi sad · restoran sa psom novi sad · kafići sa psom zlatibor · pet friendly restorani zlatibor · apartmani zlatibor psi dozvoljeni · apartmani sa psom zlatibor · smeštaj sa psom zlatibor cene · apartmani kopaonik psi dozvoljeni · apartmani tara psi dozvoljeni · apartmani divčibare pet friendly · vikendica zlatibor pet friendly · vikendica fruška gora sa psom · vikendica sa ograđenim dvorištem za psa · vikendice za izdavanje psi dozvoljeni · kuća za odmor sa psom srbija · seosko domaćinstvo pet friendly · pet friendly hotel sa spa srbija · pet friendly hoteli tara · pet friendly hotel divčibare · pet friendly hoteli vrnjačka banja · pet friendly smeštaj sokobanja · pet friendly smeštaj palić · vikend sa psom blizu beograda smeštaj · park za pse novi beograd · park za pse vračar · park za pse tašmajdan · gde pustiti psa sa povoca beograd · ada ciganlija psi · najlepša mesta za šetnju sa psom beograd · planinarenje sa psom srbija · plaža za pse srbija · kupanje psa jezero srbija · pas u vozu srbija · putovanje sa psom autobusom srbija · pasoš za psa cena · dežurni veterinar beograd 24h

### 20 local SEO keywords (geo-modified, list-of-places intent)

pet friendly beograd · pet friendly kafići beograd · pet friendly restorani beograd · parkovi za pse beograd · pet friendly novi sad · pet friendly kafići novi sad · pet friendly restorani novi sad · parkovi za pse novi sad · pet friendly niš · pet friendly kafići niš · veterinar beograd · pet shop beograd · pet friendly kafići vračar · pet friendly kafići zemun · pet friendly kafići novi beograd · park za pse tašmajdan · pet friendly splavovi beograd · pet friendly hotel beograd · pet friendly apartmani beograd · pet friendly kragujevac

### 20 content / article keywords

gde sa psom za vikend · putovanje sa psom · sa psom na more · putovanje sa psom u grčku iz srbije · putovanje sa psom u crnu goru · pas u gradskom prevozu beograd · gde šetati psa u beogradu · izlet sa psom beograd okolina · plaža za pse srbija · planinarenje sa psom srbija · zimovanje sa psom srbija · gde sa psom za novu godinu · gde sa psom za prvi maj · psi dozvoljeni (pravila u Srbiji) · ljubimci dobrodošli (nalepnica) · pasoš za psa cena · pas u avionu air serbia · pet friendly plaže crna gora · šta raditi sa psom u beogradu · ada ciganlija psi

### 10 high-commercial-intent keywords

These are the queries where a visitor is choosing where to spend money, which makes them the natural home for partner links, "featured" listings or booking buttons later.

| Keyword | Page | Commercial angle |
|---|---|---|
| pet friendly smeštaj zlatibor | `/zlatibor/smestaj` | Accommodation decision; show dog fee, size limit, fenced yard, price range |
| pet friendly apartmani zlatibor | `/zlatibor/apartmani` | Apartment-first destination |
| pet friendly hoteli zlatibor | `/zlatibor/hoteli` | Hotels publish pet policies; aggregate them |
| pet friendly smeštaj kopaonik | `/kopaonik/smestaj` | Ski season Dec–Mar |
| pet friendly apartmani kopaonik | `/kopaonik/apartmani` | Same |
| pet friendly smeštaj tara | `/tara/smestaj` | Holiday homes with yards |
| vikendica sa psom | `/vikendice` | National category with no competitor |
| pet friendly smeštaj vrnjačka banja | `/vrnjacka-banja/smestaj` | Year-round spa demand |
| pet friendly smeštaj divčibare | `/divcibare/smestaj` | Weekend trips from Belgrade |
| hoteli koji primaju pse beograd | `/beograd/hoteli` | Business and city-break travellers with dogs |

## 2.4 Keyword-to-page mapping rules (for the developer and the editor)

1. One page per *intent + location + category*, never one page per phrasing. "pet friendly kafići Beograd", "kafići sa psom Beograd" and "kafići u koje možete sa psom u Beogradu" all live on `/beograd/kafici`.
2. The title carries the loan phrase, the H1 can carry the native phrase, and the intro uses both once. Example: title "Pet friendly kafići u Beogradu – kafići u koje možete sa psom | Gde sa psom", H1 "Kafići u Beogradu u koje možete sa psom".
3. Informational queries ("gde šetati psa", "pas u gradskom prevozu") get articles, not directory pages; every article links to at least one hub and three places.
4. Accommodation queries get both an aggregate page (`/zlatibor/smestaj`) and type pages (`/zlatibor/hoteli`, `/zlatibor/apartmani`, `/zlatibor/vikendice`) only when each type has enough listings (see section 3 thresholds).
5. Do not create pages for "near me" variants; the near-me feature plus city pages cover them.
