# Pomoćnik za pretragu („Pitaj Gde sa psom“)

Bubble chat na svim javnim stranicama portala (dole desno). Posetilac napiše
šta traži, npr. „hoću da idem u Beograd u kafić“, „veterinar blizu mene“,
„smeštaj na Zlatiboru za velikog psa“ ili „idem kolima u Hrvatsku 20.
decembra“, i odmah dobija:

- **mesta iz naše baze** (kafići, restorani, barovi, smeštaj, parkovi za
  pse, veterinari, pet shopovi), sa linkom na stranicu objekta, navigacijom,
  telefonom, „Prikaži još“ u samom chatu i linkom na celu listu na sajtu;
- **proveru puta u inostranstvo** iz planera `/putovanje-sa-psom`: šta psu
  treba i do kog datuma, uz dugme „Otvori planer sa ovim podacima“ koje
  planer otvara popunjen.

Cilj: posetilac ostaje na sajtu i do rezultata stiže jednom porukom umesto
kroz filtere.

---

## Kako radi

```
poruka ──► parseMessage (u pregledaču, bez AI)
             │  grad/opština iz naših spiskova (i u padežima: „u Novom Sadu“,
             │  „na Vračaru“, „Dorćol“ → Stari grad), vrsta mesta, veličina
             │  psa, bašta, „blizu mene“, zemlja, prevoz, datumi
             ▼
          resolveStep (+ kontekst razgovora: „a u Nišu?“, „sa baštom“)
             │
             ├─ jasno ─────────────────────────────► pretraga / provera puta
             │
             └─ nejasno ─► POST assistant/parse (Claude, samo filteri)
                              │  nazive mesta tražimo u NAŠIM spiskovima
                              ▼
                           resolveStep ──────────────► pretraga / provera puta
```

1. **Lokalno tumačenje** (`domain/parse-message.ts`) razume većinu poruka:
   „kafići Beograd“, „park za pse na Vračaru“, „veterinar u Nišu“, „restoran
   sa baštom za velikog psa u Novom Sadu“, „put u Grčku avionom 15.7.“. Ne
   košta ništa i odgovara odmah. Nazive mesta čita iz istih spiskova koje
   koriste hub stranice (`countryandcities`, `township`), pa novo mesto koje
   admin doda odmah radi.
2. **AI** se zove samo kad lokalno tumačenje ne razume poruku (ili ne zna
   mesto, npr. naselje). Claude vraća **samo filtere** po JSON šemi; nikad
   ne imenuje objekte. Ako AI nije uključen, potrošen je limit ili ne radi,
   pomoćnik pita za grad ili vrstu mesta i nudi predloge.
3. **Pretraga** (`data/assistant-search.service.ts`) ide preko postojećih
   endpointa, bez izmena na backendu: `pet-friendly-spots/search-query`
   (jedan zahtev po tipu objekta, kao hub stranice), `pet-friendly-parks/list`,
   `veterinary-clinics/list`, `pet-shops/search-query`. Svaki rezultat je red
   iz baze.
4. **Put** (`trip/trip-check.ts`, poseban lazy chunk) koristi `assessTrip` i
   proverena pravila planera, sa praznim profilom psa: izveštaj kaže šta
   treba uraditi i do kada, a čip i vakcinu posetilac unosi u planeru.

### Veličina psa

Pravilo objekta (`starost`) čita se iz **naziva** u svakom redu
(`sta_ime`), ne iz id-a:

| Pas posetioca | Objekti koje prikazujemo |
|---|---|
| mali | „Mali pas“, „Mali pas i štenci…“, „Svi psi“ |
| štene veće rase (do 5 meseci) | „Mali pas i štenci…“, „Svi psi“ |
| srednji ili veliki | „Svi psi“ |

Objekat bez podatka se ne prikazuje kao pogodan. Filter se primenjuje u
pregledaču, zato što `sta_id` filter u `search-query.POST.js` pretpostavlja
drugačije id-eve od onih u bazi (`db/09`: 1 Mali pas, 2 Mali pas i štenci,
3 Svi psi). Za izabran „Svi psi“ API vraća sve objekte, a za „Mali pas“ samo
one sa tim pravilom. To je postojeće ponašanje na `/all-spots`; pomoćnik ga
ne menja, samo ga ne koristi. Isto važi za baštu (`bas_naziv`), za koju API
nema filter.

### Šta pomoćnik pamti

- Razgovor i kontekst (grad, vrsta, pas, bašta) su u `sessionStorage`
  (`gsp_assistant_v1`), bez fotografija, i traju do kraja posete. Kad
  posetilac otvori rezultat i vrati se, razgovor je tu.
- Lokacija se traži tek kad poruka traži nešto „blizu mene“. Za parkove i
  veterinare, koji u bazi nemaju koordinate, grad i opština se određuju
  preko Nominatim reverse geocoding-a (OpenStreetMap, kao u planeru).
- U GA4 idu samo vrsta koraka i pretrage (`assistant_open`,
  `assistant_message` sa `step`, `source`, `categories`, `place_kind`,
  `destination`; `assistant_result_click`), nikad tekst poruke.

---

## Gde je šta

```
apps/gde-sa-psom-portal/src/app/features/assistant/
  assistant-widget.component.*   dugme i panel (u @defer bloku app shell-a)
  assistant.session.ts           razgovor: tumačenje -> AI -> pretraga -> odgovor
  assistant-copy.ts              tekstovi (srpski i engleski)
  domain/
    text.ts, vocabulary.ts       reči koje razume, padeži
    gazetteer.ts                 gradovi i opštine iz baze, aliasi (Dorćol, Ada Ciganlija, Liman…)
    trip-text.ts                 datumi, trajanje, broj pasa
    parse-message.ts             poruka -> ParsedMessage
    resolve-step.ts              + kontekst -> sledeći korak
  data/
    assistant-search.service.ts  pretraga preko postojećih endpointa
    place-results.ts             red iz baze -> rezultat, pravila za psa i baštu
  ai/
    assistant-ai.api.ts          POST assistant/parse (status, nikad izuzetak)
    assistant-ai.validate.ts     druga provera odgovora u pregledaču
    parse-handler.spec.ts        Mars handler u Node vm kontekstu
  trip/trip-check.ts             assessTrip za chat, link ka planeru
apps/gde-sa-psom-portal/src/app/features/pet-trip/trip-prefill.ts
                                 ?destination=&transport=&transit=&departure=&return=&dogs=
apps/api/v2/assistant/parse.POST.js   Mars handler za AI tumačenje
db/10_assistant_ai.sql                limiti i keš za AI
```

Planer čita parametre iz linka posle vraćanja nacrta, preko njega postavi
zemlju, prevoz, rutu, datume i broj pasa (podaci o psu ostaju iz nacrta),
otvori korak „Pas“ i ukloni parametre iz adrese.

---

## AI tumačenje (Claude)

`POST assistant/parse`, telo `{ payload: "<JSON>", device: "<id>" }`,
`payload = { v: 1, lang, today, message }`. Šalje se samo tekst poruke,
jezik i datum; ne šalju se lokacija, prethodne poruke ni rezultati. Uvek
`200 { status, intent?, remaining?, limit?, reason? }`, statusi kao kod
`pet-trip/insights`.

- Model: `ASSISTANT_AI_MODEL`, podrazumevano `claude-sonnet-5-5`, isti
  izbor kao za objašnjenje puta. Structured output (JSON šema), `effort:
  low`, `fallbacks: "default"`.
- Izlaz se proverava na serveru i ponovo u pregledaču: samo poznate
  vrednosti, nazivi mesta samo slovima (bez linkova), datumi samo budući.
  Nazive mesta pregledač traži u našim spiskovima; mesto koje nemamo ostaje
  „nepoznato“ i pomoćnik kaže da ga nemamo.
- Keš: ista poruka (bez obzira na velika i mala slova) istog dana dolazi iz
  `assistant_ai_cache`; čuva se provereno tumačenje, ne tekst.

**Limiti (na produkciji, po UTC danu):**

| Nivo | Podrazumevano | Podešavanje |
|---|---|---|
| uređaj (heš nasumičnog id-a) | 20 tumačenja | `ASSISTANT_AI_PER_DEVICE_DAILY` |
| mreža (heš IP adrese) | 60 | `ASSISTANT_AI_PER_IP_DAILY` |
| ukupno (poziva modela) | 300 | `ASSISTANT_AI_GLOBAL_DAILY` |

Na `dev.gdesapsom.com` važi samo ukupni limit (`ASSISTANT_AI_UNLIMITED_HOSTS`).
Kad uređaj potroši limit, pomoćnik ga do kraja posete više ne pita i jednom
kaže da jasne poruke i dalje rade.

**Cena (gruba procena):** prompt sa šemom je oko 1.500 ulaznih tokena, a
odgovor 150 do 400 izlaznih. Na Sonnet 5.5 ($2 / $10 po milionu tokena) to
je oko $0,005 po pozivu modela, pa ukupni limit od 300 poziva dnevno
ograničava trošak na oko $1,5 dnevno. Stvarno je manje, jer većinu poruka
pomoćnik razume sam, a ponovljene stižu iz keša. `ASSISTANT_AI_MODEL=claude-haiku-5-5`
($0,10 / $0,50) je oko 20 puta jeftiniji. Za izdvajanje filtera iz kratke
poruke verovatno je dovoljan, ali to treba proveriti na stvarnim porukama.
Haiku nema server-side fallback, pa ga handler ne šalje.

---

## Uključivanje

Pomoćnik radi i bez ovih koraka, samo sa lokalnim tumačenjem. AI se
uključuje ovim redom:

1. Pokreni `db/10_assistant_ai.sql` u Mars DB manageru.
2. U Mars editoru napravi `assistant/parse` (POST) i nalepi ceo
   `apps/api/v2/assistant/parse.POST.js` (fajl je već u obliku iz editora,
   kao `pet-trip/insights`).
3. Mars Settings -> Software settings: `ASSISTANT_AI_ENABLED=true`.
   `ANTHROPIC_API_KEY` i so (`PET_TRIP_AI_SALT`) već postoje za planer;
   po želji `ASSISTANT_AI_SALT` i limiti iz tabele iznad.
4. U env fajlu portala (gitignored) dodaj `assistantAi: true`
   (`env.prod.ts`, i `env.qa.ts` za UAT), pa build i deploy.

Provera: na `dev.gdesapsom.com` napiši „kafić kod Ade Ciganlije za vikend“,
odnosno nešto što lokalno tumačenje ne zna. Odgovor treba da ima napomenu
„Poruku smo protumačili uz pomoć AI“, a u `assistant_ai_usage` treba da se
pojavi red.

---

## Ograničenja

- Fotografije objekata dolaze kao base64 u odgovoru `search-query` (dve po
  redu, oko 190 KB), kao i na hub stranicama. Pomoćnik zato traži 6 redova
  po odgovoru, a sa filterom (pas, bašta) najviše dva kruga po 10. Lakši
  endpoint bez slika bi ovo rešio, ali je to zaseban posao.
- Lokalno tumačenje ne zna svako naselje. Poznati krajevi su u
  `domain/gazetteer.ts` (aliasi); ostalo rešava AI kad je uključen.
- Tekstovi koje je pomoćnik već napisao ostaju na jeziku na kom su napisani;
  naslovi rezultata prate promenu jezika.
- Mobilna aplikacija (Ionic) nema pomoćnika.
