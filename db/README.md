# Baza — katalog hrane za pse + petshopovi

SQL skripte za MARS Engine. Nema migracionog sistema — Mars menja šemu kroz
browser DB manager, pa su ovo fajlovi koje lepiš i pokrećeš **ručno, redom**.

```
01_schema.sql        tabele
02_seed_lookups.sql  lookup vrednosti + početni brendovi
03_indexes.sql       indeksi
04_seed_pet_shops.sql  prve prodavnice (opciono; radi i kroz admin)
05_seed_dog_food_pseca_kasika.sql  katalog Pseće Kašike + cene
```

**Napravi backup pre pokretanja.** Nema `down` skripte.

---

## Pre pokretanja: dve provere

### 1. Tip kolone `opstina.ops_id`

`pet_shop.township_id` je jedina veza sa nasleđenom šemom. InnoDB traži da tip
kolone **tačno** odgovara roditelju.

```sql
SHOW COLUMNS FROM opstina LIKE 'ops_id';
```

`township_id` je definisan kao signed `INT` (najčešće za legacy `int(11)`). Ako
je roditelj `int(10) unsigned`, prvo uskladi kolonu, pa tek onda pokreni
`ALTER TABLE pet_shop ADD CONSTRAINT fk_pet_shop_township ...` sa dna
`01_schema.sql`:

```sql
ALTER TABLE pet_shop MODIFY township_id INT UNSIGNED NOT NULL;
```

### 2. Prava imena nasleđenih tabela

Plan piše `ops`, `iuo`, `grd` — to su **aliasi u upitima**, ne imena tabela.
Stvarna imena, iz `apps/api/v2/pet-friendly-spots/*`:

| alias | tabela |
|---|---|
| `iuo` | `info_ug_obj` |
| `ops` | `opstina` |
| `grd` | `grad` |
| `bas` | `basta` |
| `sta` | `starost` |
| `ugo` | `ugo_objekat` |

Svaki JOIN na nasleđeni deo u novim handlerima koristi prava imena.

---

## Šema

```
brand ──< dog_food >── food_type / life_stage / breed_size
              │
              ├──< dog_food_image        (base64, izolovan)
              │
              └──< dog_food_offer >── pet_shop ──> opstina (nasleđeno)
                   price, is_in_stock,
                   wolt_url, glovo_url

pending_dog_food   (moderacija, bez FK — predlog sme da bude nepotpun)
```

### Imenovanje

Nove tabele su engleske, pune reči, bez skraćenica. Nasleđene (`info_ug_obj`,
`opstina`, …) se **ne diraju** — preimenovanje bi značilo prepisivanje svih
postojećih MARS handlera. Granicu drži mapper sloj na frontendu, pa je
aplikacija engleska i tamo gde baza nije.

| Pravilo | Primer |
|---|---|
| Tabela: engleski, jednina, `snake_case` | `dog_food`, `pet_shop` |
| PK je uvek `id` | `dog_food.id` |
| FK je `<tabela>_id` | `brand_id`, `pet_shop_id` |
| Kolone bez prefiksa tabele | `name`, `slug`, `price` |
| Boolean: `is_` / `has_` | `is_active`, `is_grain_free` |
| Vreme: `created_at`, `updated_at` | |
| Indeks: `ix_<tabela>_<svrha>` | `ix_dog_food_filter` |

Ako kasnije poželiš da i stari deo bude čitljiv bez migracije podataka:

```sql
CREATE VIEW township AS
  SELECT ops_id AS id, ops_ime AS name, grd_id AS city_id FROM opstina;
```

Čitanje postaje čitljivo, pisanje i dalje ide na original.

---

## Odluke koje objašnjavaju šemu

### Zašto `dog_food_image` postoji

Ovo je jedina izmena koja stvarno menja performanse.

Danas spot nosi base64 **u svojoj koloni**, ~187KB po redu — `limit=500` vrati
~40MB (`tools/generate-sitemap.mjs` to eksplicitno beleži). Razdvajanjem:

- **lista** selektuje samo `thumbnail_base64` glavne slike → ~15KB po redu
- **detalj** selektuje `image_base64` → puna slika, jedan proizvod

**Pravilo koje ne sme da se prekrši: nijedan list/search upit ne selektuje
`image_base64`.** Zbog toga base64 sme da ostane.

Isto važi za `pet_shop.logo_base64` i `pending_dog_food.image_base64` —
`pending.GET.js` vraća `(image_base64 IS NOT NULL) AS hasImage`, ne samu sliku.

### `code` u lookup tabelama

`food_type` / `life_stage` / `breed_size` imaju `code` + `name_sr` + `name_en`.

- `code` je **stabilan ključ** — filteri, URL query parametri (`?type=dry`),
  logika. Nikad se ne prevodi; menjanje lomi postojeće deep linkove.
- `name_sr` / `name_en` znače da **nov red u bazi odmah radi u UI-ju**, bez
  frontend deploya. Danas `shared/helpers/map.helpers.ts` mapira srpski string
  iz baze u i18n ključ, pa nova vrednost renderuje prazno.

Transloco i dalje drži sve statične UI stringove; samo sadržaj iz baze dolazi
sa svojim prevodom.

### `min_price` je denormalizovan

`dog_food.min_price` je keširan `MIN(dog_food_offer.price)`. Bez njega bi svaka
lista radila korelisani subquery po redu, a filter po ceni ne bi mogao da
koristi indeks.

Cena je da **svaki upis u `dog_food_offer` mora da ga preračuna**. Blok je
identičan na četiri mesta:

- `dog-food/offers.POST.js`
- `dog-food/offers.PATCH.js`
- `dog-food/offers.DELETE.js`
- `pet-shops/delete.POST.js` (petlja po pogođenim proizvodima)

```sql
UPDATE dog_food
SET min_price = (
    SELECT MIN(o.price)
    FROM dog_food_offer o
    INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
    WHERE o.dog_food_id = :id AND o.is_in_stock = 1 AND o.price IS NOT NULL
)
WHERE id = :id;
```

Sva tri uslova su bila bug da nedostaju: ugašena prodavnica ne sme da diktira
cenu, artikal kog nema nije ponuda, a `NULL` je tačno stanje „nema cene".

Alternativa su `AFTER INSERT/UPDATE/DELETE` trigeri — lakše se zaborave, teže
debaguju, i nisu vidljivi u ovom repo-u. Handler je izabran svesno.

### `search_text`

`name + brand`, bez dijakritika, lowercase. Puni ga write handler istom NFD
normalizacijom koju frontend već koristi u `shared/utils/township.util.ts`, pa
pretraga „zitarica" nalazi „žitarica".

Uz jednu dopunu koju taj util nema: **NFD ne razlaže `đ`** — to je zasebno
slovo, ne slovo sa znakom, pa nema kombinujući znak koji bi se skinuo. Zato
server-side funkcija posle NFD koraka uvek primeni i eksplicitnu mapu
(`č ć ž š → c c z s`, `đ → dj`). Bez toga „Đubretarac" ostaje „đubretarac", a
`slugify` bi od `đ` napravio crticu.

`FULLTEXT` ignoriše termine kraće od `innodb_ft_min_token_size` (default 3), pa
search handler za kratke upite pada na `LIKE`. Bez tog fallback-a pretraga „dr"
tiho vraća praznu listu.

---

## Optimizacije upita

### Keyset paginacija umesto OFFSET

Postojeći `spots.store.ts:135` računa offset iz dužine liste, bez stabilnog
sorta — na jednakim vrednostima duplira i preskače redove. Uz to `OFFSET 2000`
skenira 2020 redova da bi vratio 20.

Svaki sort završava sa `f.id` kao tie-breakerom, i cursor nosi
`(lastValue, lastId)`:

```sql
ORDER BY f.name, f.id
-- sledeća strana:
AND (f.name > :lastName OR (f.name = :lastName AND f.id > :lastId))
```

Razvijen oblik, ne row-constructor `(f.name, f.id) > (:lastName, :lastId)` —
MySQL pre 8.0.14 ne optimizuje row poređenje i pada na full scan.

`LIMIT` je namerno `limit + 1`: višak reda je signal „ima još", bez dodatnog
upita.

### `COUNT(*)` samo na prvoj strani

`total` se računa samo kad cursor nije poslat. Danas svaki „see more" poziv
plaća pun count.

### Geo: bounding box pre Haversine formule

`pet-friendly-spots/near-me.POST.js` računa `ACOS/COS/RADIANS` za **svaki red u
tabeli** — MySQL ne može da veže izraz za indeks.

Box predfilter je običan range uslov nad kolonama, pa radi po `ix_pet_shop_geo`,
i skupa formula se računa samo nad kandidatima iz kvadrata:

```sql
AND latitude  BETWEEN :minLat AND :maxLat
AND longitude BETWEEN :minLon AND :maxLon
AND 6371000 * ACOS(LEAST(1, ...)) <= :radius
```

Dve sitnice koje su bitne:

- Dužinski stepen se skraćuje sa `COS(lat)`. Na 44°N (Srbija) je ~80km umesto
  111km — bez korekcije kvadrat bude ~39% širi nego što treba.
- `LEAST(1, ...)` štiti od domain greške `ACOS`-a. Na vrlo malim rastojanjima
  zaokruživanje ume da da argument `1.0000000002`, što vrati `NULL` i **tiho
  izbaci najbližu prodavnicu** iz rezultata.

### Poznato ograničenje: sort po ceni

`ORDER BY (f.min_price IS NULL), f.min_price, f.id` stavlja proizvode bez cene
na kraj, ali izraz `(f.min_price IS NULL)` sprečava potpuno korišćenje
`ix_dog_food_price` — očekuj `Using filesort` na toj grani.

Za veličinu kataloga koja se ovde očekuje to je prihvatljivo. Ako postane
problem, ispravka je `min_price DECIMAL(10,2) NOT NULL DEFAULT 0` + posebna
kolona `has_offer`; ostatak dizajna se ne menja.

---

## Provera posle punjenja podacima

```sql
EXPLAIN
SELECT f.id, f.name, f.slug, f.min_price, b.name AS brand_name
FROM dog_food f
JOIN brand b ON b.id = f.brand_id
LEFT JOIN dog_food_image img ON img.dog_food_id = f.id AND img.is_primary = 1
WHERE f.is_active = 1 AND f.food_type_id = 1 AND f.life_stage_id = 2
ORDER BY f.name, f.id
LIMIT 20;
```

Očekivano: `key` je `ix_dog_food_filter` ili `ix_dog_food_name`, bez
`Using filesort` i bez `Using temporary`.

U DevTools Network tabu, odgovor liste treba da bude **reda desetina KB, ne
megabajta** — to je test da li je razdvajanje slika odradilo posao.
