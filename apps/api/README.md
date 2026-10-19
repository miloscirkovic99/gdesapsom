# API — MARS Engine handleri

Ogledalo strukture iz Mars browser editora. Fajlovi ovde su izvor istine za
verzionisanje; sadržaj se lepi u Mars.

Putanja fajla je ruta: `apps/api/v2/dog-food/search-query.POST.js` →
`POST ${apiUrl}api/v2/dog-food/search-query`. Parametar rute se na Marsu
imenuje sa dvotačkom: fajl `all/:slug` (ili folder `pending/:id`) puni
`param('slug')` / `param('id')`. U repou je isti fajl `_slug.GET.js` /
`_id/`, jer Windows ne dozvoljava `:` u imenu fajla — pri lepljenju u Mars
zameni `_` sa `:`. Fajl nazvan samo `slug` je bukvalna ruta `all/slug` i
parametar ostaje prazan („Parameter slug is required").

Frontend ne zove ove putanje direktno: `ApiPrefixInterceptor` prefiksuje bilo
koji URL bez `assets` sa `${environment.apiUrl}api/v2/` i dodaje `sid` iz
`localStorage` kao query parametar. Store kod prosleđuje gole relativne putanje
(`'dog-food/search-query'`).

---

## Novi endpointi

### `dog-food`

| Metod | Putanja | Vraća |
|---|---|---|
| POST | `dog-food/search-query` | `{ data, total, cursor }` — filteri, keyset paginacija |
| GET | `dog-food/all` | `{ data, total }` — plitka lista; `?fields=sitemap`; `?fields=admin` (sesija, i ugašeni, + `&id=` za jedan sa opisom i sastavom) |
| GET | `dog-food/brands` | `{ data, total }` — svi aktivni brendovi, i bez proizvoda (lookups ih preskače) |
| POST | `dog-food/brands` | admin — nov brend; 409 ako ime već postoji |
| GET | `dog-food/images` | admin — `?dogFoodId=` galerija sa thumbnail-ima, bez punih slika |
| GET | `dog-food/all/:slug` | `{ data, images, offers, aggregate, related }` — proizvod + slike + ponude + agregat + slično |
| GET | `dog-food/random` | `{ data }` — nasumični proizvodi za landing |
| GET | `dog-food/lookups` | `{ brands, foodTypes, lifeStages, breedSizes, priceRange }` |
| POST | `dog-food/create` | admin — nov proizvod |
| PUT | `dog-food/update` | admin — **puna zamena** |
| PATCH | `dog-food/update` | admin — **parcijalna izmena** |
| POST | `dog-food/delete` | admin — meko brisanje (`hard=1` za trajno) |
| GET | `dog-food/offers` | `?dogFoodId=` ili `?petShopId=` — oba smera |
| POST | `dog-food/offers` | admin — upsert ponude |
| PATCH | `dog-food/offers` | admin — izmena cene / „na stanju" |
| DELETE | `dog-food/offers` | admin — briše vezu |
| POST | `dog-food/images` | admin — dodaje sliku u galeriju |
| PATCH | `dog-food/images` | admin — redosled, glavna slika, alt tekst |
| DELETE | `dog-food/images` | admin — briše sliku |
| GET | `dog-food/images/:id` | jedna puna slika; `?variant=thumbnail` |
| POST | `dog-food/pending` | **javno** — predlog proizvoda |
| GET | `dog-food/pending` | admin — moderaciona lista (bez slika) |
| GET | `dog-food/pending/:id` | admin — jedan predlog, sa slikom |
| PUT | `dog-food/pending` | admin — `action=approve\|decline\|reopen` |

### `pet-shops`

| Metod | Putanja | Vraća |
|---|---|---|
| POST | `pet-shops/search-query` | `{ data, total, cursor }` — filteri + geo |
| GET | `pet-shops/all` | `{ data, total }`; `?fields=sitemap` \| `?fields=map` \| `?fields=admin` (sesija, i ugašene, + `&id=` za jednu sa opisom i logom) |
| GET | `pet-shops/all/:slug` | `{ data, offers, summary, nearby }` — prodavnica + asortiman + sažetak |
| POST | `pet-shops/near-me` | `{ data, radius, total }`; opciono `dogFoodId` |
| POST | `pet-shops/create` | admin |
| PUT | `pet-shops/update` | admin — **puna zamena** |
| PATCH | `pet-shops/update` | admin — **parcijalna izmena** |
| POST | `pet-shops/delete` | admin — meko brisanje (`hard=1` za trajno) |

### `blog`

| Metod | Putanja | Vraća |
|---|---|---|
| GET | `blog/getAll` | `{ blogList }` — samo `status = 'objavljen'` (stari oblik) |
| GET | `blog/getAll/:slug` | `{ blogPostSingle: [...] }` — samo objavljen |
| GET | `blog/categories` | `{ data, total }` — `id, naziv`, za formu |
| GET | `blog/tags` | `{ data, total }` — `id, naziv`, za formu |
| POST | `blog/create` | admin — `201 { message, data, tagIds }` |

`blog/create` telo: `naslov`, `sadrzaj` (HTML) obavezni; `slug`, `kategorijaId`,
`slikaNaslovna`, `status` (`draft` \| `objavljen`, podrazumevano `draft`),
`tagIds` opcioni. Pravila:

- Admin se proverava u bazi (`korisnik.kor_admin = 1` za `kor_email` iz
  sesije), i odatle dolazi `autor_id`; telo ga ne može podmetnuti.
- `tagIds` forma šalje kao `"1,2,3"`, isti oblik kao `townshipId` u
  `pet-shops/search-query`. JSON niz `[1, 2]` handler takođe razume, ali taj
  oblik na Marsu još nije viđen.
- `slikaNaslovna` je `https://…` ili putanja na sajtu (`/assets/…`): CSP
  portala blokira `http://` slike. Stari postovi drže samo ime fajla iz
  `/assets/slike/`; `postCoverUrl()` u `shared/data-access` razume oba oblika.
- Slug: bez poslatog se pravi iz naslova (č/ć→c, š→s, ž→z, đ→dj, ostalo `-`).
  Zauzet slug je `409` sa `suggestedSlug`, ne tihi sufiks — URL posta mora biti
  onaj koji je admin video u formi.
- 400/409 nose `field` (ime polja iz tela) da forma poruku prikaže uz polje.
- Upis u `posts` i `post_tags` je u jednoj transakciji — onoj koju Mars otvara
  za svaki skript (vidi dole, tačka 3).

---

### `winter` i `planner` — generisani fajlovi

Ovi handleri se **ne pišu u `v2/` ručno**. Izvor je `apps/api/handlers/*.js`
(tanak sloj) i `apps/api/lib/` (logika, sa testovima). Fajlovi u `v2/winter/`,
`v2/planner.POST.js`, `v2/planner/` i `events/` prave se komandom (radi isto
i u PowerShell-u):

```
node tools/build-mars-api.mjs           # napravi / osveži fajlove
node tools/build-mars-api.mjs --check   # izlaz 2 ako su zastareli (to proverava i test)
```

Svaki generisani fajl je samostalan (bez `require`), pa se ceo lepi u Mars kao
i ostali. Sistemski prompt planera (`docs/planer-sistemski-prompt.md`) ulazi u
`planner.POST.js` pri ovom koraku: izmena prompta = ponovo build + ponovo
lepljenje tog fajla.

| Metod | Putanja | Fajl | Vraća |
|---|---|---|---|
| GET | `winter/destinations` | `v2/winter/destinations.GET.js` | `{ generatedAt, destinations }` — podaci zimskih stranica |
| POST | `planner` | `v2/planner.POST.js` | `{ plan_id, mode, plan, places, remaining, next_at, source, weather_attribution }`; 400 / 403 `captcha` / 429 `{ reason: device\|network\|cooldown, next_at }` / 503 |
| GET | `planner/plan/:id` | `v2/planner/plan/_id.GET.js` | isto bez `remaining` / `next_at`; 404 |
| POST | `planner/swap` | `v2/planner/swap.POST.js` | nov plan sa jednom zamenjenom stavkom (nov `plan_id`); 409 `no_alternative` |
| POST | `planner/feedback` | `v2/planner/feedback.POST.js` | `201 { ok }` — palac (`rating` 1/-1) i/ili prijava (`venue_id`, `comment`) |
| GET | `planner/quota` | `v2/planner/quota.GET.js` | `{ remaining, next_at }` za `gsp_device` kolačić |
| GET | `planner/selftest` | `v2/planner/selftest.GET.js` | admin — šta je planer našao na Mars hostu (bez tajni) |
| GET | `planner/candidates-export` | `v2/planner/candidates-export.GET.js` | admin — kandidati za `eval/build-scenarios.mjs` |
| POST | `planner/cleanup` | `v2/planner/cleanup.POST.js` | dnevno čišćenje; header `X-Cleanup-Token` ili admin |
| event | — | `events/planner-cleanup.js` | isto čišćenje kao zakazani Mars event, jednom dnevno |

Env varijable (samo na serveru): `GEMINI_API_KEY`, `CF_ACCOUNT_ID`,
`CF_AI_API_TOKEN`, `ANTHROPIC_API_KEY`, `TURNSTILE_SECRET_KEY`,
`PLANNER_HMAC_SECRET` (najmanje 32 znaka), `MET_NO_USER_AGENT`,
`PLANNER_DAILY_BUDGET_USD=0.30`. Opcione:

- `PLANNER_CLIENT_IP_HEADER` / `PLANNER_TRUSTED_HOPS` — odakle se čita adresa
  klijenta. Podrazumevano `X-Forwarded-For` i 1 proksi: uzima se adresa koju
  je upisao **naš** poslednji proksi (sa desna), nikad prva vrednost. Ako ivica
  (npr. Cloudflare) šalje jednu adresu u svom headeru, upiši ime tog headera.
- `PLANNER_ALLOWED_ORIGINS` — dodatni origin-i za CORS sa kolačićem (npr. lokalni dev).
- `PLANNER_CORS=engine` — ako Mars sam šalje CORS headere koji već dozvoljavaju
  `credentials`; inače handler šalje tačan origin (dva `Access-Control-Allow-Origin`
  headera browser odbija).
- `PLANNER_CLEANUP_TOKEN` — za `planner/cleanup` iz spoljnog crona (32+ znaka).

Pre puštanja planera (redom):

1. `db/06_planer_i_zimovanje.sql` na bazi (vidi `db/README.md`).
2. Env varijable iznad.
3. Nalepi generisane fajlove (`_id` → `:id` u imenu).
4. `GET planner/selftest` kao admin: `mars.*` sve `true` (posebno `http`,
   `env`, `remoteAddress` ili `network.header_present`), `network.detected:
   true`, `crypto: true`, sve `tables` `true`, `system_prompt_chars` > 0.
   `?live=1` pita MET Norway jednom (`met_status: 200`). `module_requests` koji
   raste od poziva do poziva znači da memorija modula traje između zahteva;
   ako ostaje 1, cooldown radi samo preko baze (i to je u redu).
5. Zakaži `events/planner-cleanup.js` jednom dnevno (ili spoljni cron na
   `POST planner/cleanup` sa `X-Cleanup-Token`).
6. Iz browsera sa `https://www.gdesapsom.com`: `GET planner/quota` mora da prođe
   CORS sa kolačićem (Network tab: odgovor ima tačan origin i
   `Access-Control-Allow-Credentials: true`).
7. Frontend: `turnstileSiteKey` u env fajlu i `"live": true` u
   `features/planner/planner-launch.json`.

Neprovereni delovi Mars API-ja (odlazni HTTP, env, headeri, adresa klijenta,
`db.commit`) traže se samo u `apps/api/lib/mars.js`; ako selftest pokaže da
nešto fali, popravlja se tu i ponovi build.

Testovi: `npx jest -c apps/api/jest.config.js`. Integracioni testovi dižu
privremenu bazu (`legacy-stub.sql` + `db/06` + `seed.sql` iz `test/fixtures`)
preko `mysql` klijenta i preskaču se bez servera; drugi server:
`MYSQL_TEST_ARGS="-h 127.0.0.1 -u root -psecret"`.

## Admin panel

Frontend: `/admin/pet-shops` i `/admin/dog-food`
(`features/admin-page/components/admin-pet-shops`, `admin-dog-food`,
`catalog-offers`), preko `shared/data-access/catalog/catalog-admin.api.ts` i
`shared/store/catalog-admin.store.ts`. Koristi:

- liste: `pet-shops/all?fields=admin`, `dog-food/all?fields=admin` (i ugašene,
  sa brojačima ponuda i slika); jedan entitet za formu: `...&id=`
- upis: `create` (POST) i `update` (PUT, puna zamena) za obe tabele;
  `update` (PATCH) samo za `isActive`; `delete` (POST, `hard=1` za trajno)
- galerija: `dog-food/images` GET/POST/PATCH/DELETE — slika i thumbnail se
  skaliraju u pregledaču (`shared/utils/image-resize.ts`) pre slanja
- ponude: `dog-food/offers` GET (oba smera, sa sirovim `offerWoltUrl` /
  `offerGlovoUrl` pored efektivnih), POST upsert, PATCH, DELETE
- brendovi: `dog-food/brands` GET/POST

DELETE zahtevi nose parametre u query stringu (`dog-food/images?id=5`), ne u
telu. Svi query stringovi se pišu u sam URL, jer `ApiPrefixInterceptor`
zamenjuje `HttpParams` sa `sid`.

## PUT vs PATCH

Nije stilska razlika — biraš pogrešan i tiho gubiš podatke.

**PUT = puna zamena.** Izostavljeno opciono polje postaje `NULL`. Za admin formu
koja učita ceo entitet pa ga snimi nazad u celini.

**PATCH = parcijalna izmena.** Dira samo poslata polja. Za „promeni cenu",
„ugasi proizvod", „ispravi telefon". PUT bi u tom slučaju obrisao opis, sastav i
linkove.

Prisutnost parametra se čita iz **liste** `param()`, ne iz vrednosti — inače
„obriši opis" (prazan string) ne bi bilo razlučivo od „ne diraj opis". Isti trik
koristi postojeći `pet-friendly-spots/update.POST.js` (`arrayHas` nad `param()`).

`slug` se **nikad ne regeneriše** iz izmenjenog imena — postojeći URL bi se
slomio i sitemap bi pokazivao na 404. Menja se samo ako je eksplicitno poslat, i
tada se proverava kolizija.

---

## Envelope

Novi endpointi vraćaju čist envelope:

```json
{ "data": [...], "total": 42, "cursor": { "lastId": 20, "lastValue": "Acana...", "sort": "name" } }
```

- `total` je `null` na svakoj strani osim prve — count se ne plaća po „see more".
- `cursor` je `null` kad nema više rezultata. Frontend ga vraća nazad kakav
  jeste i ne mora da zna koja je grana u igri (geo grana nosi `{ offset }`).

**Red iz baze ne prima nove kolone.** `db.query` vraća Mars `IRow` objekte;
`shop.offers = offers` pada sa `Column 'offers' not exists`. Zato detalji
(`dog-food/all/:slug`, `pet-shops/all/:slug`, `dog-food/pending/:id`) vraćaju
kolekcije kao zasebne ključeve pored `data` (`{ data, offers, summary, nearby }`),
a `data` je običan objekat prepisan iz reda po eksplicitnoj listi ključeva —
ta lista mora da prati `SELECT`. `bySlug` u `shared/data-access/catalog`
sklapa envelope nazad u jedan red pre mapera. Dokazano radi: `write(key, rows)`
(niz redova), `write(key, { ...skalari iz reda })`; neproveren je nested niz
redova unutar običnog objekta, zato ključevi idu na vrh.

Stari endpointi (`{ spotsList, totalResults }`, `{ spotsListSingle: [...] }`)
ostaju netaknuti; mapper sloj u `shared/data-access` normalizuje oba oblika.

**Prazna lista nije greška.** Postojeći `pet-friendly-spots/search-query.POST.js`
vraća 404 na praznu pretragu, što tera frontend da hvata error za sasvim
normalan ishod „nema rezultata". Novi endpointi vraćaju `200` sa `data: []`.

JSON polja su `camelCase` engleski (`brandName`, `minPrice`, `isInStock`,
`woltUrl`) — aliasi se rade u SQL-u, pa mapper na frontendu ima manje posla.

---

## Konvencije preuzete iz postojećeg koda

```js
module.exports = (MARSModules) => {
with (MARSModules) {
    let sessionUser = session('user');
    if (!sessionUser) { response.status(401); write('message', 'Not Authorized'); exit(); }

    let x = param('x', null);          // param(ime, default)
    let sent = param();                // lista prisutnih parametara

    db.query(sql, a, b);               // pozicioni `?`
    db.query(sql, { a: 1, b: 2 });     // imenovani `:a`

    write('key', value);
}
}
```

Auth je `sid` iz `localStorage`, koji interceptor kači na svaki zahtev;
`session('user')` ga razrešava server-side. `sessionUser.kor_admin` razlikuje
admina od obične sesije — koristi se samo za trajno brisanje.

## Pretpostavke koje treba potvrditi u tvojoj Mars instanci

Handleri su izvedeni iz postojećih fajlova; MARS docs
(`docs.marsengine.net/docs/api-reference/database`) ne opisuju oblik reda
(`IRow`) ni imenovanje parametara rute. Tri stvari nisu potvrđene u praksi:

1. **`SELECT LAST_INSERT_ID() AS id` posle INSERT-a.** Docs kažu da svaki
   INSERT/UPDATE kroz `db.query` vraća niz ID-eva upisanih redova, pa je
   dodatni upit verovatno višak. `LAST_INSERT_ID()` je per-konekcija i
   siguran je pod paralelnim upisima; zameni ga povratnom vrednošću tek kad
   `create.POST.js` prođe na Marsu i oblik niza bude viđen.

2. **`response.setCache('1Y')`** — zakomentarisano u `dog-food/images/_id.GET.js`.
   Poziv postoji u `search-query/_id/avatar.GET.js`, takođe zakomentarisan.

3. **Transakcije su implicitne.** Docs (`concepts/database-transactions`):
   svaki skript je jedna transakcija — commit kad se završi, rollback na
   grešku **ili `exit()`**; `db.commit()` / `db.rollback()` postoje za ručnu
   kontrolu. Zato 4xx grane pozivaju `exit()` samo pre prvog upisa, a
   `blog/create` se oslanja na to za `posts` + `post_tags`. `pending.PUT.js`
   (odobravanje) je pisan pre ovog saznanja, pa i dalje označava predlog
   odobrenim **tek na kraju**; to ne smeta.

## Napomena o postojećim fajlovima

Nekoliko fajlova u `v2/` ne odgovara svom imenu i nije dirano:
`township.GET.js` i `township.POST.js` su PNG binarni sadržaj,
`gardenTypes.GET.js` sadrži insert parka, `countryandcities.GET.js` vraća tipove
bašte, a `gmail.POST.js` je kopija park PUT handlera. Vredi ih uskladiti sa
Mars instancom, ali je to zaseban posao.
