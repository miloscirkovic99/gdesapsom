# API — MARS Engine handleri

Ogledalo strukture iz Mars browser editora. Fajlovi ovde su izvor istine za
verzionisanje; sadržaj se lepi u Mars.

Putanja fajla je ruta: `apps/api/v2/dog-food/search-query.POST.js` →
`POST ${apiUrl}api/v2/dog-food/search-query`. Folder sa `_` prefiksom je
parametar rute — `blog/getAll/_slug.GET.js` čita `param('slug')`.

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
| GET | `dog-food/all` | `{ data, total }` — plitka lista; `?fields=sitemap` |
| GET | `dog-food/all/:slug` | `{ data }` — proizvod + slike + ponude + agregat + slično |
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
| GET | `pet-shops/all` | `{ data, total }`; `?fields=sitemap` \| `?fields=map` |
| GET | `pet-shops/all/:slug` | `{ data }` — prodavnica + asortiman + sažetak |
| POST | `pet-shops/near-me` | `{ data, radius, total }`; opciono `dogFoodId` |
| POST | `pet-shops/create` | admin |
| PUT | `pet-shops/update` | admin — **puna zamena** |
| PATCH | `pet-shops/update` | admin — **parcijalna izmena** |
| POST | `pet-shops/delete` | admin — meko brisanje (`hard=1` za trajno) |

---

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

MARS docs (`docs.marsengine.net`) nisu bili dostupni, pa je sve izvedeno iz
postojećih handlera. Tri stvari nisu potvrđene:

1. **`SELECT LAST_INSERT_ID() AS id` posle INSERT-a.** Povratni oblik
   `db.query` za INSERT nije vidljiv ni u jednom postojećem fajlu
   (`create.POST.js` ignoriše rezultat). `LAST_INSERT_ID()` je per-konekcija i
   siguran je pod paralelnim upisima, ali ako Mars vraća `insertId` direktno,
   taj dodatni upit je višak.

2. **`response.setCache('1Y')`** — zakomentarisano u `dog-food/images/_id.GET.js`.
   Poziv postoji u `search-query/_id/avatar.GET.js`, takođe zakomentarisan.

3. **Nema eksplicitnih transakcija.** Nijedan postojeći handler ih ne koristi.
   Zbog toga je `pending.PUT.js` (odobravanje) napisan tako da svaki prekid
   ostavi stanje koje se može ponoviti: predlog se označava odobrenim **tek na
   kraju**, pa neuspeh na pola znači da predlog i dalje čeka i akcija sme da se
   pokrene ponovo.

Ako Mars nudi `db.transaction`, `pending.PUT.js` i `pet-shops/delete.POST.js`
su dva mesta koja bi je iskoristila.

## Napomena o postojećim fajlovima

Nekoliko fajlova u `v2/` ne odgovara svom imenu i nije dirano:
`township.GET.js` i `township.POST.js` su PNG binarni sadržaj,
`gardenTypes.GET.js` sadrži insert parka, `countryandcities.GET.js` vraća tipove
bašte, a `gmail.POST.js` je kopija park PUT handlera. Vredi ih uskladiti sa
Mars instancom, ali je to zaseban posao.
