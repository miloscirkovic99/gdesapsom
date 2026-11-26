# Putovanje sa psom (`/putovanje-sa-psom`)

Alat na portalu koji odgovara na tri pitanja za put iz Srbije sa psom:

1. **Spremnost:** šta pravila traže, šta je potvrđeno, šta treba uraditi i do kog datuma.
2. **Troškovi:** koliko put košta, po kategorijama, sa oznakom odakle je svaki iznos.
3. **Poređenje:** do tri varijante puta, sa jasnom porukom kad nisu uporedive.

Put se unosi jednom (korak „Put“ i „Pas“). Izveštaj o spremnosti, troškovi svake
varijante, poređenje i zahtev za AI objašnjenje računaju se iz istih podataka u
pregledaču, bez zahteva ka serveru. Samo mobilna aplikacija nema ovaj alat.

Stanje: 23. oktobar 2026, ruleset `2026-10-23.1`.

---

## Gde je šta

```
apps/gde-sa-psom-portal/src/app/features/pet-trip/
  domain/                čista logika, bez Angulara (može kasnije u lib)
    trip.models.ts       model puta i psa, zajednički za oba alata
    readiness.ts         assessTrip(trip, ruleset, danas, jezik) -> izveštaj
    costs.ts             estimateScenario(...) -> obračun jedne varijante
    compare.ts           compareScenarios(...) -> najjeftinija ili zašto ne
    *.messages.ts        rečenice izveštaja i obračuna, srpski i engleski
    vignettes.ts         važenje vinjeta i najjeftinija kombinacija
    lang.ts              jezici (sr, en), Localized/Label, localize()
    money.ts, dates.ts, distance.ts, countries.ts
    rules/
      rule.models.ts     oblik pravila i izvora
      sources.ts         registar izvora (URL, izdavač, datum provere)
      ruleset.ts         pravila (verzionisana) i pokrivenost po zemlji
      prices.ts          vinjete, kursevi, Air Serbia, takse
  ai/                    zahtev, provera odgovora, HTTP klijent
  components/            koraci, izveštaj, troškovi, pregled
  pet-trip.planner.ts    stanje stranice (signali), nacrt u localStorage
  pet-trip-copy.ts       tekstovi stranice (srpski i engleski)
apps/api/v2/pet-trip/insights.POST.js   Mars handler za AI objašnjenje
db/07_pet_trip_ai.sql                    limiti i keš za AI
```

---

## Pokrivenost

Samo **nekomercijalno** kretanje (pas putuje sa vlasnikom ili ovlašćenom
osobom, nije na prodaju ni udomljavanje). Za komercijalno kretanje izveštaj
kaže da ga ne pokriva.

| Destinacija | Nivo | Napomena |
|---|---|---|
| Hrvatska | pun | EU uslovi, ulazna mesta za ljubimce (NN 80/2025), pravila za bul terijere |
| Slovenija, Austrija, Nemačka, Italija | pun | EU uslovi; Nemačka: zabrana 4 rase uz izuzetak do 4 nedelje. Kolima se ulazi preko Hrvatske ili Mađarske |
| Mađarska, Rumunija, Bugarska | delimičan | EU uslovi provereni, ali spisak ulaznih mesta je star (2017, bez datuma, 2009) |
| Grčka | delimičan | spisak ulaznih mesta iz 2006; put kolima kroz Severnu Makedoniju |
| Crna Gora, BiH, Severna Makedonija | delimičan | samo stariji zvanični izvori; prikazuju se kao „Potrebna provera“ |

„Pun“ znači da su za tu zemlju provereni i EU uslovi i ono posebno što smo
našli na zvaničnim stranicama te zemlje. Ne znači da je put dozvoljen: svaki
izveštaj i dalje ima stavke koje odlučuju prevoznik, veterinar ili inspekcija.

Izveštaj nikad nije „spreman“ dok bilo šta traži proveru ili podatke, a pravilo
iz starijeg izvora nikad samo ne blokira put: pokazuje datume kao „ako ovo
pravilo i dalje važi“.

---

## Pravila: kako se održavaju

Svako pravilo (`RuleRecord` u `rules/ruleset.ts`) ima:

- `sourceIds`: bar jedan izvor iz `rules/sources.ts`;
- `verifiedAt`: dan kad je neko uporedio pravilo sa izvorom (`null` = nikad, uvek „Potrebna provera“);
- `reviewBy`: posle tog dana pravilo je zastarelo i prikazuje se kao „Potrebna provera“;
- `dated`: kad je jedini zvanični izvor star ili arhiviran;
- `check`: kako se pravilo računa (brojevi kao 21 dan ili 10 dana su u podacima, ne u kodu).

**Izmena pravila:**

1. Otvori izvor i uporedi tekst.
2. Izmeni zapis na oba jezika (`title`, `summary`, `caveat`, `howTo`, `dated` su `{ sr, en }`),
   povećaj mu `version`, postavi `verifiedAt` na današnji dan.
3. Za nov izvor dodaj zapis u `sources.ts` sa `checkedAt` (samo stranice koje si otvorio); naslov i
   izdavač na oba jezika, ili običan string kad je to izvorni naslov stranice (nemački zakon, engleska stranica).
4. Povećaj `RULESET.version`.
5. `npx nx test gde-sa-psom-portal --testFile=apps/gde-sa-psom-portal/src/app/features/pet-trip/domain/readiness.spec.ts`:
   test „ruleset data“ proverava da svaki izvor postoji, da je svaki iskorišćen, da su datumi ispravni
   i da svaki tekst pravila ima i srpsku i englesku verziju.

**Rokovi za ponovnu proveru:** zakoni i EU propisi `2027-04-23`, prevoznici i
spiskovi ulaznih mesta `2027-01-23`, cene `2027-01-31` (vinjete Austrije već
od 1. 12. 2026, kad počinje nova godina vinjeta).

**Nova destinacija:** dodaj zemlju u `countries.ts`, pravila sa `scope`
(`destination`, `transit`, `route`, `return-home`), unos u `RULESET.coverage`, i
po potrebi ulazna mesta u `ENTRY_POINTS`. Bez zapisa u `coverage` zemlja van EU
dobija delimičan izveštaj („nismo proverili“), a zemlja EU opšta EU pravila.

---

## Šta je provereno (23. 10. 2026)

Sve ispod je pročitano na zvaničnim stranicama tog dana. Tekstovi propisa EU
pročitani su iz Službenog lista preko Kancelarije za publikacije EU (EUR-Lex je
vraćao zaštitu od botova); u aplikaciji se linkuje ELI adresa propisa.

| Tema | Izvor | Status |
|---|---|---|
| Nova EU pravila od 22. 4. 2026 | Delegirana uredba (EU) 2026/131, Sprovedbena 2026/636 i 2026/705 | provereno |
| Srbija bez testa titra od 19. 6. 2026 | Sprovedbena uredba (EU) 2026/1228; Uprava za veterinu (17. 6. 2026) | provereno |
| Čip ISO 11784/11785 pre vakcine; drugi čip uz sopstveni čitač | 2026/131 čl. 13, 2026/132 | provereno |
| Vakcina: 12 nedelja, 21 dan posle prve, revakcinacija u roku važenja | 2026/131 čl. 14, 2026/133 | provereno |
| Sertifikat: najviše 10 dana pre ulaska, 6 meseci posle (ne duže od vakcine) | 2026/131 čl. 18–19 | provereno (ranije pravilo od 4 meseca više ne važi) |
| Izjava vlasnika, ovlašćena osoba, 5 dana | 2026/131 čl. 4 i 18; Uredba 2016/429 čl. 245 | provereno |
| Najviše 5 ljubimaca | Uredba 2016/429 čl. 246 | provereno |
| Ulaz preko mesta za ljubimce | 2016/429 čl. 249, 2026/131 čl. 15 | provereno |
| Ulazna mesta Hrvatska (Bajakovo, Batina, Erdut, Ilok, Tovarnik; voz Tovarnik) | NN 53/2023, NN 80/2025 | provereno; spisak prethodi 2026/131 |
| Ulazna mesta Mađarska, Rumunija, Bugarska, Grčka | spiskovi na sajtu Evropske komisije | stari (2017, bez datuma, 2009, 2006): „Potrebna provera“ |
| Austrija: prijava ljubimca na carini na aerodromima | BMF, stanje 20. 5. 2026 | provereno |
| Srpski pasoš ne zamenjuje EU sertifikat | 2026/131 čl. 20; Uprava za veterinu | provereno |
| Ko izdaje sertifikat u Srbiji, zahtev, 30 dana, potvrda od 48 h, takse 420 + 9.160 din | Uprava za veterinu: ČPP i obrazac (avgust 2025) | provereno; iznos taksi je možda usklađen, zato je „procena“ |
| Pasoš prati psa pri svakom kretanju | Pravilnik Sl. glasnik RS 23/12 | provereno (izmene nisu proverene) |
| Povratak iz EU: čip, vakcina, pasoš; bez sertifikata i titra | Pravilnik Sl. glasnik RS 20/2019 | provereno, ali pravilnik ne kaže posebno kako važi za psa iz Srbije: „Potrebna provera“ |
| Povratak iz Crne Gore | isti pravilnik: Crne Gore nema na listama | „Potrebna provera“ (doslovno: sertifikat i titar) |
| Crna Gora, BiH, Severna Makedonija: ulaz (i tranzit kroz SM) uz test titra | Uprava CG (2016/2020, arhivirano), Kancelarija BiH (2016), AHV SM (2015/2019/2021) | stari izvori: „Potrebna provera“ |
| Nemačka: zabrana 4 rase, izuzetak do 4 nedelje | HundVerbrEinfG § 2, HundVerbrEinfVO § 2, carina | provereno |
| Hrvatska: bul terijeri bez FCI ne smeju ni u tranzit; povodac i brnjica za listu rasa | Pravilnik NN 117/2008 čl. 11; MVEP | provereno (izmene posle 2008. nisu proverene) |
| Air Serbia: samo kabina, do 8 kg sa transporterom, 40/70 € po letu | stranica Air Serbia (blog.airserbia.com) | provereno; prtljažni prostor nije objavljen |
| Wizz Air, Ryanair: bez ljubimaca | stranice prevoznika | provereno |
| Srbijavoz: brnjica, povodac, 50% karte 2. razreda | dve stranice Srbijavoza | provereno; stranice se razlikuju oko velikih pasa |
| MÁV (međunarodni vozovi): povodac i brnjica, potvrda o vakcini ne starija od godinu dana | uslovi MÁV od 14. 12. 2025 | provereno |
| Niš-Ekspres: bez životinja u autobusu | opšti uslovi | provereno; za druge prevoznike nema objavljenih pravila |

Nije pokriveno: tretman protiv pantljičare (traže ga Finska, Irska, Malta,
Severna Irska i Norveška, koje nisu na spisku destinacija), štenci mlađi od 15
nedelja (iz trećih zemalja ne mogu u EU), komercijalno kretanje, mačke i tvorovi.

---

## Cene

| Cena | Izvor | Napomena |
|---|---|---|
| Vinjete Mađarska (D1, HUF, 2026) | nemzetiutdij.hu | dnevna, 10 dana, mesečna |
| Vinjete Slovenija (2A, EUR) | evinjeta.dars.si | sajt ne navodi godinu |
| Vinjete Austrija (EUR, 2026) | asfinag.at | važe do 30. 11. 2026; posle toga „procena“ |
| Vinjete Bugarska (EUR, od 1. 8. 2026) | bgtoll.bg | mesec se završava dan pre istog datuma |
| Rovinjeta Rumunija (RON, po Euro normi) | portal.etoll.ro (OMTI 959/2026) | datum primene nije potvrđen; bez Euro norme prikazuje se raspon |
| Kurs EUR/RSD 117,4822 | NBS, 23. 10. 2026 | posetilac ga može promeniti |
| Kurs HUF 366,43, RON 5,345 | ECB, 22. 10. 2026 | |
| Doplata Air Serbia 40/70 € po letu | Air Serbia | |
| Takse za sertifikat 9.580 din | obrazac Uprave za veterinu, avgust 2025 | prikazuje se kao procena |

Putarine po deonici (Srbija, Hrvatska, Severna Makedonija, Grčka, Italija)
unosi posetilac; uz polje su linkovi na zvanične cenovnike. Gorivo, smeštaj,
doplate smeštaja, karte, hrana i aktivnosti su uvek unos posetioca. Udaljenost
je unos posetioca ili gruba procena: vazdušna linija (Nominatim) × 1,2–1,9.

Oznake u obračunu: **Uneto** (posetilac), **Zvanična cena** (gore, sa izvorom),
**Procena** (pretpostavka koju red navodi), **Nedostaje** (ukupno je donja
granica), **Nije uneto** (neobavezno, ne ulazi u zbir).

Najjeftinija varijanta se imenuje samo kad sve imaju sve potrebne troškove,
neobavezni troškovi su uneti za sve ili ni za jednu, i raspon jedne je ceo ispod
sledeće. Isti nedostajući trošak veterinara u svim varijantama ne smeta.

---

## AI objašnjenje (Claude)

Dugme „Objasni uz AI“ u kartici „Pregled“. Model samo prepričava gotov
izveštaj; pravila i iznosi dolaze iz koda iznad.

**Tok:** pregledač šalje samo statuse, ključeve pravila, rokove, iznose i
tekstove izveštaja (bez gradova, datuma rođenja, imena) na
`POST pet-trip/insights`, uz nasumičan id uređaja i jezik stranice (`lang`:
`sr` ili `en`; bez njega srpski). Model piše na tom jeziku, a srpsko i
englesko objašnjenje istog puta su u kešu odvojeno. Mars handler proverava svako
polje, broji limite (dole), gleda keš, zove Anthropic Messages API preko
`net.client` (Mars nema npm, pa SDK ne može da radi tamo), proverava odgovor
(JSON šema, samo poznati ključevi, bez linkova, bez brojeva kojih nema u
zahtevu) i vraća ga. Pregledač ga proverava još jednom pre prikaza. Uvek 200,
sa `status`: `ok | cached | disabled | quota | busy | unavailable | invalid`,
i `remaining`/`limit` (koliko objašnjenja uređaj još ima) i `reason` uz `quota`.

**Limiti (na produkciji):**

| Nivo | Ključ | Podrazumevano | Zašto |
|---|---|---|---|
| uređaj | heš nasumičnog id-a iz pregledača | **5 ukupno** (`PET_TRIP_AI_PER_DEVICE_LIMIT`; `PET_TRIP_AI_DEVICE_WINDOW=day` za 5 dnevno) | limit korisnika |
| mreža | heš IP adrese, po UTC danu | 20 dnevno (`PET_TRIP_AI_PER_IP_DAILY`) | zaustavlja skriptu koja briše id uređaja; nije 5 jer mobilni operateri stavljaju mnogo korisnika iza iste adrese |
| ukupno | — | 50 poziva modela dnevno (`PET_TRIP_AI_GLOBAL_DAILY`) | budžet |

- Broje se odgovori `ok` i `cached` (keširan odgovor troši limit uređaja, ali ne poziva model). Isto dugme za isti izveštaj u istoj poseti pregledač odgovara iz memorije i ništa ne šalje.
- Neuspeh (`busy`, `unavailable`, `invalid`) se vraća u limit uređaja i mreže; ukupni brojač ostaje kad je model možda potrošio tokene.
- Kad server kaže da uređaj nema više objašnjenja, dugme se zaključa. „Počni ispočetka“ ne briše id uređaja.
- **Dev:** na hostu iz `PET_TRIP_AI_UNLIMITED_HOSTS` (podrazumevano `dev.gdesapsom.com`) limiti po uređaju i mreži ne važe; ukupni dnevni limit važi i tamo, jer dev deli ključ sa live-om. Server čita host sa kog je stigao zahtev, pa pregledač ne može da „proglasi“ produkciju devom. `PET_TRIP_AI_UNLIMITED_HOSTS=none` uključuje limite i na devu.
- Lokalni `nx serve` koristi `env.dev.ts`, koji gađa **produkcijski** API: tu limit važi. Za test bez limita koristi `uat` build (dev.gdesapsom.com).
- Ograničenje: id uređaja je u `localStorage`, pa ga korisnik može obrisati (ili koristiti privatni prozor); tada važi limit mreže. Jači identitet bi tražio naloge ili CAPTCHA (npr. Cloudflare Turnstile).

**Uključivanje (redom):**

1. Pokreni `db/07_pet_trip_ai.sql` na bazi (dev, pa live).
2. Mars Settings → Software settings:
   - `ANTHROPIC_API_KEY`: ključ iz Claude Console (preporuka: poseban workspace sa limitom potrošnje);
   - `PET_TRIP_AI_SALT`: nasumičan niz od 32+ znaka;
   - opciono `PET_TRIP_AI_MODEL` (podrazumevano `claude-sonnet-5-5`), `PET_TRIP_AI_PER_DEVICE_LIMIT` (5), `PET_TRIP_AI_DEVICE_WINDOW` (`total`), `PET_TRIP_AI_PER_IP_DAILY` (20), `PET_TRIP_AI_GLOBAL_DAILY` (50), `PET_TRIP_AI_UNLIMITED_HOSTS` (`dev.gdesapsom.com`), `PET_TRIP_AI_IP_HEADER`;
   - na kraju `PET_TRIP_AI_ENABLED=true`.
   Dev, test i live dele podešavanja: uključeno na jednom je uključeno svuda.
3. Nalepi `apps/api/v2/pet-trip/insights.POST.js` u Mars editor (ceo fajl, ruta `pet-trip/insights`, POST).
4. Proba: `POST /api/v2/pet-trip/insights` sa `payload` i `device` iz pregledača (Network tab) treba da vrati `status: ok` i `remaining: 4`, a drugi put `cached` i `remaining: 3`; šesti put sa istim `device` na produkciji `quota`, `reason: device`. Na dev.gdesapsom.com `remaining` je `null`.
   Proveri i da `request.ip` daje adresu posetioca, ne proksija: ako svi dobijaju istu, limit mreže bi važio za sve zajedno (tada postavi `PET_TRIP_AI_IP_HEADER`).
5. U env fajlu portala `petTripAi: true` (env fajlovi nisu u gitu; bez ključa dugme se ne prikazuje), pa build i deploy.

**Šta nije provereno:** handler nije pokrenut na Marsu. Testovi ga izvršavaju u
Node `vm` kontekstu sa lažnim Mars globalima i lažnim odgovorima API-ja. Na
hostu treba potvrditi da `net.client(...).params(objekat)` sa
`contentType('application/json')` šalje JSON telo, da `config()` čita ključeve
i da `db.commit()` radi pre spoljnog poziva. Mars `net` nema timeout:
pregledač odustaje posle 30 s, a skripta završi i upiše keš.

**Cena:** izmereno na tipičnom izveštaju (jedan pas, dve varijante): sistemski
prompt, šema i podaci imaju oko 7.500 znakova, približno 2.000–3.000 ulaznih
tokena; izlaz je kratak JSON (uz razmišljanje niskog napora), `max_tokens` je
4.096. Podrazumevani model je `claude-sonnet-5-5` ($2/$10 po MTok): dobar
srpski za pola cene Opusa, obično oko 1–2 centa po pozivu, najviše oko 6
centi. Podrazumevani limit je 50 poziva dnevno, pa je najgori dan oko $3, a
tipičan oko $0,50–1. Sa `claude-opus-5-5` ($4/$20) sve je duplo skuplje, a za
prepričavanje gotovih podataka ne treba. `claude-haiku-5-5` ($0,10/$0,50) je
manje od desetog dela centa po pozivu, ali njegov srpski nije proveren: pre
prelaska uporedi ista putovanja na dev.gdesapsom.com (keš se vodi po modelu,
pa svaki model odgovara iznova). Na workspace-u ključa u Claude Console
postavi mesečni limit potrošnje (uz Sonnet: $20, mejl na $10); Default
Workspace ga ne dozvoljava, pa ključ mora biti u posebnom workspace-u. Keš
(7 dana) odgovara na isti izveštaj bez novog poziva. Proveri cene na
platform.claude.com pre uključivanja.

**Privatnost:** opisano u `/privacy-policy` (stavka „Planer putovanja sa psom“).
U bazi nema IP adrese, id-a uređaja ni sadržaja forme: samo heševi sa tajnom
solju (uređaj: do 400 dana od poslednje upotrebe; IP | datum: 35 dana) i
validirano objašnjenje u kešu (30 dana). Id uređaja nastaje tek na prvi klik na
„Objasni uz AI“, ne pri otvaranju stranice.

---

## Provere

```bash
npx nx test gde-sa-psom-portal --testFile=apps/gde-sa-psom-portal/src/app/features/pet-trip   # domen, AI, handler, stranica
npx nx test shared-util                                                                           # ključevi rs/en
npx ngc -p apps/gde-sa-psom-portal/tsconfig.app.json --noEmit                                     # šabloni
npx nx build gde-sa-psom-portal                                                                   # prerender /putovanje-sa-psom
```

---

## Pre puštanja u produkciju

- Neko ko odgovara za sadržaj treba da pročita svako pravilo uz izvor (tabela iznad), posebno delimično proverene stavke.
- Host mora da služi `/putovanje-sa-psom/index.html` ili da tu putanju vrati na `index.csr.html` (vidi `DEPLOYMENT_CHECKLIST.md`); lokalni `.htaccess` je ažuriran, ali nije u gitu.
- AI ostaje isključen dok se ne prođu koraci iznad.
- Alat prati jezik sajta (srpski ili engleski). Prerenderovana stranica je na srpskom; engleski se uključuje u pregledaču. Engleski tekstovi pravila su prevod srpskih zapisa, ne novo čitanje izvora: kad se pravilo menja, menjaju se oba.
- Procena udaljenosti zove javni Nominatim (najviše 1 zahtev u sekundi, samo na klik). Za veći saobraćaj treba sopstveni geokoder ili ruting servis.
