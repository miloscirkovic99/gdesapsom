# 11. Competitor analysis and 12. Backlink strategy

## 11.0 How this was researched (and what "verified" means here)

Two research passes were run from the analysis environment, which **could not open any Serbian web page directly** (outbound fetches to .rs and related domains were blocked by the network policy). Everything below is therefore based on **search-engine index data: real URLs, page titles and content snippets** returned by a US-based search tool for Serbian- and English-language queries. Consequences:

- A domain or URL marked **[IDX]** exists in the index with the stated title/snippet; its current content and inventory were *not* inspected.
- **[MEN]** = mentioned by an indexed source; its own page was not confirmed. **[UNV]** = could not be verified at all.
- No traffic, ranking, domain-authority or "share of voice" numbers appear anywhere; listing counts are quoted only when a snippet stated them, and they can be out of date.
- The search tool is not a Serbian SERP. Which domain "surfaced most often" is a weak proxy for who ranks in Serbia; treat it as a lead list, not a ranking report. Re-run the core queries from Serbia (incognito, `google.rs`, Serbian interface) before acting on rank assumptions.

## 11.1 The competitive landscape

### A. Direct Serbian pet-friendly directories and blogs (closest competitors)

| Site | What it is | Structure seen | Depth and freshness signals | Strengths | Gaps GdeSaPsom can exploit |
|---|---|---|---|---|---|
| **dogfriendly.rs** – "DogFriendly Srbija" [IDX] | WordPress directory | City pages `/listing-location/novi-sad/`; listings `/friendly/{slug}/` | Snippet: 53 locations for Belgrade, 16 for Novi Sad; no blog seen; a listing for "Telenor prodavnice" suggests content older than the 2022 rebrand (inference) | Clean city → listing architecture; categories incl. shopping centres and kennels | Small inventory, likely stale; no parks; no dog-size/indoor filters visible |
| **petfriendlysrbija.rs** – "Animal Zone" [IDX] | Directory + services + adoption | Category pages `/pet-friendly/restorani/`, `/pet-friendly/parkovi/`, `/pet-usluge/pet-shop-ovi/`, `/pet-usluge/pansioni-za-pse-i-macke/`, `/pet-usluge/pet-taxi/`, `/pet-usluge/setaci-pasa/`; prose lists, no per-venue pages; posts dated 2022 | Belgrade-centric; has a dog-parks page (Tašmajdan, Hala Pionir, Šumice…) | The only Serbian site seen with parks + pet-services verticals (pet taxi, walkers, rentals) | No individual venue pages (thin per-venue SEO), Belgrade only, no filters/map evidence. Candidate for partnership on services rather than head-on competition |
| **pet-friendly.rs** – "Pet Friendly Novi Sad" [IDX] | Community map + blog (grew out of a 2017 Facebook group) | Interactive map of venues; blog mostly pet-care how-tos (`/zabranjena-hrana-za-pse/`) | luftika.rs reports 138 venues, 65 cafés; sticker programme | Strong Novi Sad community and inventory | Novi Sad only; venues live in a map, not crawlable listing pages; blog is off-topic for travel. Best treated as a partner (credit + mirror) rather than a rival |
| **petfriendlyhoteli.com** [IDX] | Serbian-language accommodation catalogue + travel guides, regional (RS, MNE, HR, SLO, GR) | Flat topic slugs: `/pet-friendly-tara/`, `/pet-friendly-restorani-beograd-novi-sad/`, `/letovanje-sa-velikim-psom-srbija-grcka/`, `/pet-friendly-plaze-crna-gora/`, `/putovanje-sa-psom-avionom-air-serbia/`, `/pasos-za-psa-srbija/` | Titles carry "2026" (actively maintained); claims verified accommodation; addresses large-dog travel | **The strongest editorial/SEO competitor seen** (surfaced in 7 distinct core-theme queries); covers most travel keywords in section 2 | No cafés/parks/vets verticals; no city × category pages; accommodation-centric. GdeSaPsom wins on structured venue data and city coverage, must match their editorial cadence on travel topics |
| **kudasapsom.com** – "Kuda sa psom" [IDX] | Personal hiking/travel blog (author + dog Nala) | `/blog/izletista-u-beogradu-bojcinska-suma`, `/blog/fruska-gora`, `/blog/stara-planina-pt-1` | Editorial only; trails with GPS data | Ranks next to gdesapsom.com for "gde sa psom" | **Brand-confusion risk** ("kuda" vs "gde"); also a natural link partner (trails ↔ venues) |
| Seen only as titles [UNV beyond title]: superljubimac.rs (`/pet-friendly/`), postopice.rs (`/lokali/ljubimci`), trazimzauvekdom.com (`/pet_friendly_beograd/`), petfriendlyns.blogspot.com, "Shapa app" (journal.rs), "PawsNow" app | Portals/lists | – | – | – | Monitor; none shows a nationwide structured directory |

Candidates checked and **not found**: psidobrodosli.rs, dogfriendly.hr, psi-dobrodosli.hr, pas.rs (no DNS, no index); petfriendly.rs, mojpas.rs, dogo.rs, ljubimci.com resolve but have no indexed pages; petfriendly.me appears parked.

### B. Accommodation platforms with pet-friendly facets (they own "smeštaj / hoteli / apartmani / vikendice" today)

| Platform | Pet-friendly URL pattern [IDX] | Counts quoted in snippets (not verified) | What they lack |
|---|---|---|---|
| **Booking.com** | `/pets/country/rs.html`, `/pets/region/rs/central-serbia.html`, `/pets/region/rs/tara-planina.html`, `/pets/city/rs/belgrade.html`, `/kopaonik.html`, `/novi-sad.html`, `/nis-rs.html`… Serbian titles exist ("Hoteli pogodni za kućne ljubimce…") | Belgrade ~1,000; Zlatibor ~500; Kopaonik ~240; Novi Sad ~235; Vrnjačka Banja 150–180; Niš ~170; Divčibare ~140; Subotica ~67; Bajina Bašta ~56 | Dog fee/size data inconsistent per property; no cafés, parks, vets; no Serbian editorial |
| **Airbnb** | `/belgrade-serbia/stays/pet-friendly`, `/zlatibor-district-serbia/stays/pet-friendly`, `/kopaonik-serbia/stays/pet-friendly` | "over 2,100" in Belgrade | Listings only; no Serbian locale pages seen |
| **tara.rs** / tarasmestaj.rs | `/sr/tara-pet-friendly-smestaj/`, `/en/property-feature/petfriendly/`; `/smestaj/pet-friendly/` | "over 100 pet-friendly objects on Tara" | Tara only; no dog attributes beyond "pet friendly" |
| **zlatibor.org** (portal) and **zlatibor.org.rs** (tourism org) | `/smestaj-pet-friendly/` (snippet: only 2 properties on the page); TO page `/sr/pet-friendly-objekti-na-zlatiboru/` | – | Thin pet-friendly inventory on the dedicated page |
| **selo.rs**, **seoski-turizam.rs**, **topsmestaj.com**, **gdenaodmor.rs**, **bookaweb.com**, **srbija.sobe-smestaj.com**, **topglobaltag.com**, **vrnjackabanjasmestaj.rs**, **weekendica.com** | Facet pages such as `/f/pet-friendly-smestaj`, `/odmor-sa-kucnim-ljubimcem/`, `/pogodnost/pet-friendly/` (paginated), `/sr/tara/smestaj/pet-friendly`, `/pet-friendly-smestaj` | Dozens to hundreds of rural/holiday-home listings | "Pet friendly" is a yes/no facet; no fee, size, fenced-yard, indoor data; no venues around the stay |
| **wellness-spa.rs** | `/pet-friendly-spa-hoteli-u-srbiji/`, `/usluga/pet-friendly/` | Lists weight limits and fees (e.g. ≤10 kg, 1,200 RSD/day at one hotel) | Spa hotels only — but proves users want fee/limit data |
| **apartmani-u-beogradu.com** | Rental site that also built `/kafici-beograd/pet-friendly`, `/restorani-beograd/pet-friendly`, blog "pet friendly restorani u Beogradu" | Surfaced in 5 queries | Competes on "pet friendly kafići Beograd" with a rental site's authority; thin dog data |
| OTAs in English (Expedia, Hotels.com, Skyscanner, Trip.com, eDreams, TripAdvisor, BringFido lodging) | City "pet-friendly hotels" pages | – | Dominate the US-index results; no Serbian editorial |

### C. General directories and guides with a pet-friendly attribute

- **011info.com / 381info.com** [IDX]: Belgrade business directory with `/pet-friendly`, `/tag/pet-friendly-restorani/{opština}` (paginated, **municipality level**) and `/blizu-mene` (near-me) pages; 381info covers Novi Sad, Vršac, Čačak, Vrnjačka Banja, Novi Pazar. Strength: township granularity. Gap: generic venue data, no dog rules.
- **planplus.rs** [IDX]: map directory with a **dog-parks category and per-park pages** (`/en/belgrade/dog-parks`, `/park-za-pse/133903`); ranks for "parkovi za pse Beograd". Gap: no attributes, no editorial.
- **lokalibezdima.rs** [IDX]: non-smoking venue map (Belgrade, Novi Sad) with a "Pet Friendly" tag per venue. **serbiafoodhub.com** [IDX]: restaurant guide with an explicit "pets indoor vs garden" attribute (numeric URLs). **wanderlog.com** and **BringFido** [IDX]: English auto-generated lists; BringFido carries size/fee data for some hotels but thin Serbian venue data.

### D. Media and editorial that rank for the themes (no listings)

nova.rs (pet friendly kafići u Beogradu), journal.rs (kuda sa psom Beograd okolina; pet-friendly vikendice u Srbiji), westm.rs (10 destinations with a dog), petmagazine.rs, turizamarriva.rs (top 10 pet-friendly beaches and lakes in Serbia), N1 "Ljubimci" vertical, telegraf.rs `/teme/pet-friendly` tag hub, 021.rs, mojnovisad.com, nsuzivo.rs, eventuj.rs, b92 "Ljubimac", kurir.rs (the "Ljubimci dobrodošli" sticker), belgradecitycard.rs, ukusbeograda.rs; English: theculturetrip.com, allaboutbelgrade.com, morethanbelgrade.com, stillinbelgrade.com. All [IDX]. These pages are static listicles; they are both competitors for informational queries and the best link targets (section 12).

### E. Tourism organisations and government

serbia.travel `/sr-lat/putovanje-sa-kucnim-ljubimcima/` (editorial, names no venues), welcometoserbia.gov.rs `/putovanje-sa-kucnim-ljubimcem` (entry rules), tob.rs "Info za kućne ljubimce" (pet parks, pet shops, emergency vets, kennels; **no cafés/restaurants/hotels page**), zlatibor.org.rs pet-friendly page (the most developed TO pet page). All [IDX].

### F. Regional (for later expansion)

Croatia: doggycheckin.com (portal since 2014), infozagreb.hr pet map, istra.hr pet-friendly section, bookiscout.com island guides, several travel-with-dog blogs that dominate the plain query "putovanje sa psom". Montenegro: no native portal verified; petfriendly.me likely parked. Bosnia: furaj.ba blog only. The regional gap is Montenegro and Bosnia, not Croatia.

## 11.2 Feature comparison

| Capability | GdeSaPsom today | dogfriendly.rs | petfriendlysrbija.rs | pet-friendly.rs (NS) | petfriendlyhoteli.com | Booking.com /pets | 011info | planplus |
|---|---|---|---|---|---|---|---|---|
| City pages | No | Yes | Partial (Belgrade) | Map only | No | Yes | Yes (+ municipality) | Yes |
| Category × city pages | No (query param) | Partial | Yes (prose) | No | No | Yes (hotels only) | Yes (restaurants) | Yes (generic) |
| Destination pages / guides | No | No | No | No | **Yes** | Yes (listings) | No | No |
| Per-venue pages | Yes (numeric IDs) | Yes | No | No | Partial | Yes | Yes | Yes |
| Dog size allowed | **Yes** | ? | No | No | Partial (large dogs) | Partial | No | No |
| Indoor vs garden | Partial (garden flag) | ? | No | No | No | No | No | No |
| Dog fee | No | No | No | No | Partial | Partial | No | No |
| Dog parks with pages | List only | No | Prose page | No | No | No | No | **Yes** |
| Vets / pet shops | Yes | Yes | Yes | No | No | No | Yes | Yes |
| Map + near me | Yes | ? | No | Yes | No | Yes | Yes (blizu mene) | Yes |
| Editorial / guides | 6 posts | No | Blog | Blog (care) | **Strong** | FAQ | No | No |
| Crawlable, prerendered HTML | **No** | Yes | Yes | ? | Yes | Yes | Yes | Yes |
| Nationwide | Yes | Partial | Belgrade | Novi Sad | Regional | Yes | Belgrade (+381info) | Yes |

Reading: nobody combines nationwide coverage, per-venue dog rules (size, indoor, fee, water), parks, vets, destinations **and** crawlable city × category pages. That combination is the positioning. The two real threats are petfriendlyhoteli.com (editorial velocity on travel keywords) and Booking's `/pets/` hierarchy (every accommodation head term); the way around both is specificity (dog facts per venue) and locality (cafés, parks, vets around the stay), which neither can produce.

## 11.3 Content gaps and keyword opportunities (from the comparison)

1. **Structured dog rules per venue** (size, indoor/garden, fee, water bowl, fenced yard): only wellness-spa.rs and serbiafoodhub.com expose fragments. Every place page and category page should lead with these.
2. **Complete, geolocated dog-park dataset**: TOB lists ~14 Belgrade parks, Zelenilo reports 13 built + 5 planned, Novosti says 20; Novi Sad, Niš (Čair) and Subotica (Dudova šuma, Prozivka) have scattered sources. No single maintained list exists; building it earns links from utilities, TOs and media (section 12).
3. **Destination guides with listings** ("Zlatibor sa psom", "Tara sa psom"): petfriendlyhoteli.com has guides without local venues; portals have listings without guides.
4. **Holiday homes with a fenced yard** ("vikendica sa psom", "ograđeno dvorište"): facets exist on selo.rs/topsmestaj/weekendica, but no dog-specific attributes; journal.rs has one article.
5. **Novi Sad crawlable venue pages**: pet-friendly.rs holds the community data in a map; mojnovisad/eventuj/nsuzivo have short listicles. Credit the community and publish the structured version.
6. **Niš, Kragujevac, Subotica, Čačak**: 381info tag pages only; no dog-specific pages.
7. **Municipality level in Belgrade**: 011info proves the demand with per-municipality tag pages; `/beograd/vracar/kafici` style pages (above threshold) match it with better data.
8. **Travel rules in Serbian** (GSP, trains, buses, Air Serbia, Greece/Montenegro borders): covered piecemeal by media and petfriendlyhoteli.com; a maintained, dated hub ("Ažurirano 2026") can win.
9. **English for visitors** ("dog friendly Belgrade"): BringFido/Wanderlog/Culture Trip are thin and old; a `/en/belgrade` page with real data is a medium-term win.
10. **"Psi dozvoljeni" regulations**: queries return petitions and IKEA-type pages; a clear explainer is uncontested.

## 11.4 Observations about gdesapsom.com in the index (to fix)

- Both `http://gdesapsom.com/…` and `https://www.gdesapsom.com/…` URLs are indexed → confirm the 301 chain and the canonical host (section 9, C4).
- A GitHub pull request from the public repository ranks for the brand query "gde sa psom" → consider making the repository private or at least ensure the homepage outranks it with brand signals (it will, once prerendered and linked).
- The indexed snippet claims "1,000+ locations" and the site copy says "1.000+ proverenih lokacija", while the sitemap holds 127 places. Replace marketing numbers with live counts everywhere (the landing page already has a data-driven trust line); inflated claims hurt trust and, if a journalist checks, the data-story pitch.

---

## 12. Backlink strategy

### 12.1 Principles

- **Assets before asks.** Every outreach e-mail offers something concrete: a dataset, a ready-to-publish list, an embeddable map, a badge, a quote. Generic "please link to us" mails to Serbian tourism organisations and media get ignored.
- **Relevance over volume.** A link from tob.rs, zlatibor.org.rs, vetks.org.rs or N1's pets vertical is worth more than fifty directory entries. Serbian-language, dog- or travel-related pages only.
- **No paid links, link networks or exchanges disguised as partnerships.** Reciprocal links with tourism organisations and data partners are fine because they are editorially justified.
- **Nofollow and brand mentions count** for traffic and entity recognition; do not fight over `rel` attributes.
- **Timing hooks now:** World Animal Day is 4 October (this week); Serbian media and travel sites have been writing about the 2026 easing of EU pet-travel rules for travellers from Serbia (reported by paragraf.rs and welcometoserbia.gov.rs [IDX]); ski-season planning starts in November.

### 12.2 Link-worthy assets to build (in this order)

1. **Open dog-park dataset** (GeoJSON/CSV + photos) for Belgrade, Novi Sad, Niš, Subotica with fencing, lighting, water, equipment fields. Offer it to JKP Zelenilo-Beograd, TOB, Opština Novi Beograd, Grad Novi Sad / Gradsko zelenilo, GO Medijana (Niš), Grad Subotica, and to media as "mapirali smo sve parkove za pse".
2. **Per-destination one-pagers** (Zlatibor, Kopaonik, Tara, Divčibare, Vrnjačka Banja, Palić, Niš): counts of pet-friendly stays, restaurants, cafés, nearest 24/7 vet, local rules — ready to paste into tourism-org sites that have no pet page.
3. **Embeddable co-branded map** ("Pet friendly Beograd – podaci: Gde sa psom") for TOB, TO Novi Sad, Moj Novi Sad, NS Uživo, Still in Belgrade.
4. **"Psi dobrodošli" venue badge** (digital + sticker with the listing URL), ideally coordinated with the existing "Ljubimci dobrodošli" sticker campaign (organiser reported as Le PETit via kurir.rs [IDX article; organisation site UNV]).
5. **Quarterly data story** ("najviše pet friendly grad u Srbiji", "koliko lokala naplaćuje boravak psa", "porast pet friendly smeštaja po regionu").
6. **Guest-article templates** for trainers ("Kako pripremiti psa za kafić"), vets ("Checklista pre puta sa psom") and travel sites ("Vikend sa psom na …").

### 12.3 Priority shortlist (first 90 days)

| # | Target | Why | Ask / offer |
|---|---|---|---|
| 1 | **Turistička organizacija Beograda – tob.rs "Info za kućne ljubimce"** (subpages: Pet parkovi, Pet šopovi, Hitna pomoć, Pansioni) [IDX] | The section has no "pet friendly kafići, restorani, hoteli" page | Offer to supply and maintain that page (data + attribution link); offer the reconciled dog-park list with coordinates and photos |
| 2 | **TO Zlatibor – zlatibor.org.rs** pet-friendly page + "Blog Zlatibor" [IDX] | Only tourism org with a curated pet page; serbia.travel's newsletter praised it | Reciprocal links; guest post "Vikend na Zlatiboru sa psom"; "Pet friendly Zlatibor" badge for their listed objects |
| 3 | **TOS – serbia.travel "Putovanje sa kućnim ljubimcima"** (sr-lat + EN) and its "Bilten" newsletter [IDX] | National page that says "choose pet-friendly accommodation" but names none | Ask to be the referenced resource; pitch a Bilten story with numbers per destination; offer the co-branded map |
| 4 | **welcometoserbia.gov.rs "Putovanje sa kućnim ljubimcem"** [IDX] | Government page on travelling with pets (entry rules) | Formal request to add a "Korisni resursi" link |
| 5 | **divcibare.rs "Korisni linkovi"** (TO Valjevo) [IDX] | A real useful-links page on a tourism-org site | Direct inclusion request plus a Divčibare pet-friendly list they can publish |
| 6 | **Veterinarska komora Srbije "Linkovi"** (vetks.org.rs) and **Fakultet veterinarske medicine "Linkovi"** (vet.bg.ac.rs/sr-lat/linkovi) [IDX] | Institutional link pages | Inclusion request; offer free listings for all licensed clinics; offer the dataset for student research |
| 7 | **N1 "Magazin / Ljubimci"** [IDX] | Dedicated pets vertical that already ran pet-friendly venue and travel pieces | Data story: "Koji grad u Srbiji je najviše pet friendly" with an embeddable map and a quote |
| 8 | **Moj Novi Sad, NS Uživo, 021.rs** [IDX] | All three published Novi Sad pet-friendly lists or maps | Offer the maintained 2026 list and the dog-park dataset; ask for a link in the existing articles |
| 9 | **nova.rs "pet friendly kafići u Beogradu"** and **telegraf.rs tag "pet friendly"** [IDX] | Evergreen listicles that get refreshed | Pitch the 2026 edition with counts per municipality |
| 10 | **Still in Belgrade** (EN) [IDX] | Coffee guides mention dog-friendly venues; no dog guide exists | Offer "Dog-friendly Belgrade: the complete guide" built from the data |
| 11 | **westm.rs, journal.rs, turizamarriva.rs, weekendica.com, srbijaspace.rs, travelmagazine.rs** [IDX] | Already published "putovanje sa psom" or "vikendice sa psom" pieces | Ask for a resource link in the existing article; offer a follow-up with venue data per destination |
| 12 | **Kinološki savez Republike Srbije (ksrs.rs)** [IDX] | News section + 50+ member clubs with contacts | "Pet friendly smeštaj i restorani u blizini izložbe" mini-guide per CACIB show for their notices; use the clubs list for local outreach |
| 13 | **ORCA (orca.rs)** [IDX] | Animal-welfare NGO with pet content | Co-publish a "Pet friendly Srbija indeks" around World Animal Day; resource link on their pets page |
| 14 | **Directories with free listings:** imenik.rs, planplus.rs, yellowpages.rs, firmesrbije.rs [IDX] | Baseline citations for the Organization entity | Create consistent listings (name, URL, description); ignore any "poslovna baza" payment-slip scams (a known pattern in Serbia) |
| 15 | **Forum Krstarica and putovanja.info pet/travel threads** [IDX] | Real questions ("gde sa psom u X", "sa psom na more") | Answer with the specific page, not the homepage; respect forum rules |

### 12.4 Target list by category (verified status in brackets)

**Travel sites and magazines [IDX]:** westm.rs (10 destinations with a dog) · journal.rs (pet-friendly vikendice; kuda sa psom okolina Beograda) · srbijaspace.rs blog · weekendica.com blog (holiday-home marketplace: data partnership + host badge) · turizamarriva.rs (beaches and lakes) · travelmagazine.rs (three dog-travel pieces; "Vesti" accepts short news) · putovanja.info forum (long "sa kućnim ljubimcem na odmor" threads) · 021.rs "Život/Putovanja" · selo.rs (rural stays stating "ljubimci dozvoljeni": data exchange + host badge) · tara-planina.com, divcibare.org.rs (private portals: "Tara/Divčibare sa psom" resource link) · nikana.gr Serbian blog (Greece with a dog: "pet friendly stops in Serbia on the way" link) · underdreamskies.com (Croatian dog-travel blog: guest post for drivers transiting Serbia) · teleporter.rs, Air Serbia blog (press items).

**Tourism organisations [IDX unless noted]:** serbia.travel (+ Bilten) · welcometoserbia.gov.rs · tob.rs · zlatibor.org.rs · novisad.travel (per-venue pet notes, no aggregated page: propose "Novi Sad sa ljubimcem") · raskaturizam.rs (Kopaonik; no pet content: offer "Kopaonik sa psom") · taradrina.com (Bajina Bašta; "Vesti" section) · tov.rs / divcibare.rs · vrnjackabanja.co.rs · visitnis.com (offer the Čair dog-park page + venue list) · visitsubotica.rs (per-venue pet flags; propose "Palić i Subotica sa psom") · RTO Zapadna Srbija [UNV].

**Municipalities and public utilities (dog parks) [IDX]:** JKP Zelenilo-Beograd (news item on the newly built dog park; "13 dog parks since 2014, five more planned") · beograd.rs articles on Čuburski park, Tašmajdan, Šumice · Opština Novi Beograd (reported as the "first pet friendly municipality") · Grad Novi Sad (ordinance PDF naming designated dog areas; JKP Gradsko zelenilo page; 021.rs on three new parks: Železnički park, Jovana Subotića/Kisačka, Hadži Ruvimova) · Grad Niš / GO Medijana (Čair park: 24h, lit, cameras, agility) · Grad Subotica (Dudova šuma, Prozivka; planned Palić, Teslino naselje). Angle for all: the open dataset as the canonical list with a source link.

**Pet organisations, shelters, trainers [IDX unless noted]:** Kinološki savez Republike Srbije (+ member clubs list) · ORCA · Le PETit / "Ljubimci dobrodošli" sticker campaign [article IDX, site UNV] · PAN Novi Sad "Pet friendly objekti" project [articles IDX, site UNV] · SPANS Novi Sad, Animal Rescue Serbia, Feniks, Zaboravljene šape [MEN/UNV] · Instagram: @udruzenjebetabg, @animalhope.riska, @balkanunderdogs ("pet friendly mesto nedelje" collabs) · JKP Veterina Beograd (advice page) · trainers UrbanDOG, GoDoG, dresurapasa.rs, K9 Sheva (guest article "Kako pripremiti psa za kafić i restoran" ↔ "preporučeni trener" listing) · dog walkers / daycare (listing-for-link in a future "pansioni/šetači" category).

**Veterinary [IDX]:** Veterinarska komora Srbije (Linkovi, Vesti, regional boards) · Fakultet veterinarske medicine (Linkovi; Kinološka sekcija) · Vet Planet Clinic 24/7 (active blog: co-signed "checklista pre puta") · SASAP small-animal association (newsletter mention) · Zoocentar Novi Sad [article IDX, site UNV] · academic hook: a TurPos journal article on the pet-friendly concept in Serbian hospitality (cite it; offer the dataset to the authors).

**Pet shops and brands [IDX]:** Pet Centar (vet-written blog "Pitajte veterinara"; co-written "Sa psom na odmor u Srbiji"; in-store QR flyer) · Zoo Hobby (distributor; sponsored printed map) · petshop.rs, petshop.co.rs (Aquarius), petspot.rs, bubipetshop.rs (blog mentions) · petpoint.rs (shop directory; DNS failed from the sandbox — verify it is live) · Urban Pets "Život sa psom" and Premium Pet "Putovanje sa kućnim ljubimcem" (inline link requests) · purina.rs articles (car-travel guide) · Royal Canin Serbia [UNV].

**Media [IDX]:** N1 (pets vertical) · nova.rs, zadovoljna.nova.rs · telegraf.rs (tag hub; GSP dog-transport article; "pet-friendly stays growing" article) · 021.rs · mojnovisad.com · nsuzivo.rs · juznevesti.com, niskevesti.rs (Niš) · wannabemagazine.com · mondo.rs · espreso.co.rs (reactive: pet-fee controversies) · danas.rs ("Dijalog" op-eds; kennels piece) · b92.net "Ljubimac" · vreme.com · kurir.rs · novosti.rs · stillinbelgrade.com (EN) · najzena.alo.rs · paragraf.rs (legal reference only). [UNV]: citymagazine.rs, lepaisrecna.rs, noizz.rs, zena.blic.rs, BgOnline, Belgrade Beat, Reddit r/serbia and r/belgrade (check manually).

**Citations [IDX]:** imenik.rs (free registration) · planplus.rs (free profile; also a data source for vets, pet shops, trainers) · yellowpages.rs · firmesrbije.rs · Kompass (free basic B2B). [UNV]: 11870.com, zutestrane.rs, cylex.rs, kompanije.rs, firmografija, poslovniimenik.rs — verify before spending time. International: submit parks and venues to BringFido with Gde sa psom as the source; keep Google Play, Wikidata and social profiles consistent.

### 12.5 Three outreach templates (Serbian, adapt per target)

**Tourism organisation / municipality**
> Predmet: Besplatna lista pet friendly mesta u {destinacija} za vaš sajt
> Poštovani, Gde sa psom je besplatan imenik mesta u Srbiji u koja se može sa psom. Za {destinacija} trenutno imamo {N} proverenih objekata (smeštaj, restorani, kafići, veterinar). Primetili smo da na {stranica} nema odeljka za goste sa ljubimcima — možemo vam dostaviti spremnu listu ili ugraditi mapu (sa navođenjem izvora), i redovno je ažurirati. Da li bi to bilo korisno vašim posetiocima?

**Media data story**
> Predmet: Podaci: koji grad u Srbiji je najviše pet friendly (mapirali smo {N} lokala i {M} parkova za pse)
> {Ime}, uz Svetski dan životinja pripremili smo brojke iz imenika Gde sa psom: {3 bullet findings}. Imamo mapu koju možete ugraditi i sagovornika za izjavu. Ceo dataset je otvoren.

**Venue badge**
> Predmet: Vaš lokal je na Gde sa psom — bedž "Psi dobrodošli" za sajt i vrata
> Vaš objekat {naziv} je proveren i objavljen: {URL}. Šaljemo digitalni bedž i nalepnicu; ako ga postavite na sajt sa linkom ka svojoj stranici, posetioci sa psima će lakše pronaći tačne informacije (veličina psa, bašta/unutra, doplata).

### 12.6 Cadence and measurement

- Weeks 1–2: build the dog-park dataset v1 (Belgrade) and the Belgrade one-pager; send the World Animal Day data story (N1, nova.rs, telegraf, 021); request inclusion on divcibare.rs, vetks.org.rs, vet.bg.ac.rs link pages; create the free directory listings.
- Weeks 3–6: TOB, TO Zlatibor, TOS, welcometoserbia.gov.rs; Novi Sad media and community (pet-friendly.rs, Moj Novi Sad, NS Uživo); forum answers (two per week).
- Weeks 7–12: badge programme to the first 50 venues; trainer/vet guest articles; KSRS show guides; ski-season pitches (Kopaonik, Zlatibor); selo.rs / weekendica data partnership.
- Track in a sheet: target, contact, asset offered, date, status, resulting URL. Goal for the first 90 days (a target, not a forecast): 15–25 relevant referring domains, at least three from tourism organisations or public bodies.
