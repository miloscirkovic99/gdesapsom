-- =============================================================================
-- 05_seed_dog_food_pseca_kasika.sql  --  katalog obroka: Pseca Kasika
--
-- Pokrenuti POSLE 01_schema.sql, 02_seed_lookups.sql i 04_seed_pet_shops.sql
-- (prodavnica mora da postoji -- ponude se kace na nju).
--
-- Idempotentno svuda: UNIQUE(slug) na dog_food i UNIQUE(dog_food_id,
-- pet_shop_id) na dog_food_offer, uz ON DUPLICATE KEY UPDATE. Ponovno
-- pokretanje osvezi cene umesto da pukne.
--
-- Nijedan id se ne pise kao broj: brend, lookup-i i prodavnica se resavaju
-- JOIN-om po `slug` / `code`. Ako neki nedostaje, JOIN ne vrati red i INSERT
-- upise 0 redova -- provere na dnu fajla to hvataju.
--
-- Izvedena polja koja bi inace racunao dog-food/create.POST.js:
--   slug         = slugify(brand + ' ' + name)         -- rucno, ASCII
--   search_text  = normalizeText(brand + ' ' + name)   -- lowercase, bez dijakritika
--   min_price    = racuna se na dnu, posle upisa ponuda
--
-- PAZNJA na encoding: imena i opisi sadrze c/c/z/s. Fajl je UTF-8 i pocinje sa
-- SET NAMES utf8mb4. Posle pokretanja pogledaj provere sa dna.
--
-- PAZNJA na tacka-zarez: Mars-ov SQL runner deli fajl na taj znak bez obzira
-- na navodnike, pa presecen string literal puca na nezatvorenom navodniku.
-- Zato nijedan tekst ovde -- ni u stringu ni u komentaru -- ne sadrzi taj
-- znak. Isto vazi kad dodajes nov proizvod.
-- =============================================================================

SET NAMES utf8mb4;


-- --- tip hrane: kuvana -------------------------------------------------------
-- Postojeci food_type nema kategoriju za kuvane obroke. `wet` bi bio pogresan
-- (to je konzerva), `raw` je suprotnost. Zato nov code `cooked`.
--
-- Isti red stoji i u 02_seed_lookups.sql -- ponovljen je ovde namerno, da fajl
-- moze da se pokrene samostalno na bazi koja je 02 videla ranije.
INSERT INTO food_type (code, name_sr, name_en, sort_order) VALUES
  ('cooked', 'Kuvana hrana', 'Cooked food', 3)
ON DUPLICATE KEY UPDATE
  name_sr = VALUES(name_sr), name_en = VALUES(name_en), sort_order = VALUES(sort_order);


-- --- brend -------------------------------------------------------------------
-- Pseca Kasika je i proizvodjac i prodavnica: isto ime postoji u `brand` (za
-- katalog) i u `pet_shop` (za mapu). To su dve razlicite stvari, ne duplikat.
INSERT INTO brand (name, slug, website_url) VALUES
  ('Pseća Kašika', 'pseca-kasika', 'https://psecakasika.rs/')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), website_url = VALUES(website_url);


-- =============================================================================
-- PROIZVODI
--
-- 12 obroka + 3 dodatka. Sve je `all` po uzrastu i velicini rase -- proizvodjac
-- ne deli asortiman po tome.
--
-- is_grain_free = 0 za obroke (integralni pirinac), 1 za dodatke (samo meso
-- odnosno kosti).
--
-- package_weight_g za pakovanja "500g + 100g buster" je 600 -- ukupna masa koju
-- kupac dobije, jer se po tom broju poredi cena po kilogramu.
-- =============================================================================

INSERT INTO dog_food
  (name, slug, brand_id, food_type_id, life_stage_id, breed_size_id,
   description, ingredients, package_weight_g, is_grain_free, search_text, is_active)
SELECT
  p.name, p.slug, b.id, t.id, ls.id, bs.id,
  p.description, p.ingredients, p.package_weight_g, p.is_grain_free, p.search_text, 1
FROM (
  -- --- pileci obroci: karabatak ----------------------------------------------
  SELECT
    'Karabatak premium 300g'                                       AS name,
    'pseca-kasika-karabatak-premium-300g'                          AS slug,
    'cooked'                                                       AS type_code,
    'Kuvani obrok od pilećeg karabataka, 50% mesa. Pakovanje 300 g.' AS description,
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.' AS ingredients,
    300                                                            AS package_weight_g,
    0                                                              AS is_grain_free,
    'pseca kasika karabatak premium 300g'                          AS search_text
  UNION ALL SELECT
    'Karabatak premium 500g + 100g buster',
    'pseca-kasika-karabatak-premium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od pilećeg karabataka, 50% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika karabatak premium 500g + 100g buster'
  UNION ALL SELECT
    'Karabatak superpremium 300g',
    'pseca-kasika-karabatak-superpremium-300g',
    'cooked',
    'Kuvani obrok od pilećeg karabataka, 70% mesa. Pakovanje 300 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.',
    300, 0, 'pseca kasika karabatak superpremium 300g'
  UNION ALL SELECT
    'Karabatak superpremium 500g + 100g buster',
    'pseca-kasika-karabatak-superpremium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od pilećeg karabataka, 70% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika karabatak superpremium 500g + 100g buster'

  -- --- juneci obroci ----------------------------------------------------------
  UNION ALL SELECT
    'Junetina premium 300g',
    'pseca-kasika-junetina-premium-300g',
    'cooked',
    'Kuvani obrok od junetine, 50% mesa. Pakovanje 300 g.',
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.',
    300, 0, 'pseca kasika junetina premium 300g'
  UNION ALL SELECT
    'Junetina premium 500g + 100g buster',
    'pseca-kasika-junetina-premium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od junetine, 50% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika junetina premium 500g + 100g buster'
  UNION ALL SELECT
    'Junetina superpremium 300g',
    'pseca-kasika-junetina-superpremium-300g',
    'cooked',
    'Kuvani obrok od junetine, 70% mesa. Pakovanje 300 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.',
    300, 0, 'pseca kasika junetina superpremium 300g'
  UNION ALL SELECT
    'Junetina superpremium 500g + 100g buster',
    'pseca-kasika-junetina-superpremium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od junetine, 70% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika junetina superpremium 500g + 100g buster'

  -- --- pileci obroci: file ----------------------------------------------------
  UNION ALL SELECT
    'File premium 300g',
    'pseca-kasika-file-premium-300g',
    'cooked',
    'Kuvani obrok od pilećeg filea, 50% mesa. Pakovanje 300 g.',
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.',
    300, 0, 'pseca kasika file premium 300g'
  UNION ALL SELECT
    'File premium 500g + 100g buster',
    'pseca-kasika-file-premium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od pilećeg filea, 50% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 50%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika file premium 500g + 100g buster'
  UNION ALL SELECT
    'File superpremium 300g',
    'pseca-kasika-file-superpremium-300g',
    'cooked',
    'Kuvani obrok od pilećeg filea, 70% mesa. Pakovanje 300 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun.',
    300, 0, 'pseca kasika file superpremium 300g'
  UNION ALL SELECT
    'File superpremium 500g + 100g buster',
    'pseca-kasika-file-superpremium-500g-100g-buster',
    'cooked',
    'Kuvani obrok od pilećeg filea, 70% mesa, uz 100 g BUSTER dodatka. Pakovanje 500 g + 100 g.',
    'Meso 70%, integralni pirinač, povrće, kolagenski bujon (12 sati kuvane juneće i pileće kosti), hladno ceđeno maslinovo ulje, jaje, peršun. BUSTER: pileće srce i papalina.',
    600, 0, 'pseca kasika file superpremium 500g + 100g buster'

  -- --- dodaci -----------------------------------------------------------------
  -- package_weight_g je NULL za bujon: izvor ne navodi pakovanje.
  UNION ALL SELECT
    'Kolagenski bujon',
    'pseca-kasika-kolagenski-bujon',
    'supplement',
    'Bujon kuvan 12 sati od junećih i pilećih kostiju. Prirodan izvor kolagena za zglobove, hrskavicu i ligamente, kožu i sjaj dlake. Bogat mineralima, lako svarljiv, podstiče apetit kod izbirljivih pasa.',
    'Juneće i pileće kosti, voda.',
    NULL, 1, 'pseca kasika kolagenski bujon'
  UNION ALL SELECT
    'Buster juneća srca i papalina 100g',
    'pseca-kasika-buster-juneca-srca-i-papalina-100g',
    'supplement',
    'Prirodni proteinski pojačivač obroka. Gvožđe, cink i vitamini B grupe za energiju i vitalnost. Papaline nose omega-3 i kolagen za kožu i sjaj dlake, a kalcijum i fosfor za zube i kosti.',
    'Juneća srca, cele papaline.',
    100, 1, 'pseca kasika buster juneca srca i papalina 100g'
  UNION ALL SELECT
    'Buster pileća srca i papalina 100g',
    'pseca-kasika-buster-pileca-srca-i-papalina-100g',
    'supplement',
    'Prirodni proteinski pojačivač obroka. Pileća srca su izvor taurina, gvožđa i vitamina B grupe. Papaline nose omega-3 i kolagen za kožu i sjaj dlake, a kalcijum i fosfor za zube i kosti.',
    'Pileća srca, cele papaline.',
    100, 1, 'pseca kasika buster pileca srca i papalina 100g'
) p
JOIN brand      b  ON b.slug  = 'pseca-kasika'
JOIN food_type  t  ON t.code  = p.type_code
JOIN life_stage ls ON ls.code = 'all'
JOIN breed_size bs ON bs.code = 'all'
ON DUPLICATE KEY UPDATE
  name             = VALUES(name),
  brand_id         = VALUES(brand_id),
  food_type_id     = VALUES(food_type_id),
  life_stage_id    = VALUES(life_stage_id),
  breed_size_id    = VALUES(breed_size_id),
  description      = VALUES(description),
  ingredients      = VALUES(ingredients),
  package_weight_g = VALUES(package_weight_g),
  is_grain_free    = VALUES(is_grain_free),
  search_text      = VALUES(search_text),
  is_active        = VALUES(is_active);


-- =============================================================================
-- PONUDE  --  cene u prodavnici Pseca Kasika (Senjak)
--
-- Cene su sa sajta, u dinarima, stanje na dan seed-a.
--
-- offer.wolt_url ostaje NULL: to je deep link do bas tog proizvoda, a poznat je
-- samo link do prodavnice -- on vec stoji na pet_shop.wolt_url.
--
-- "Buster pileca srca i papalina 100g" ide sa price = NULL: cena nije navedena
-- u izvoru. NULL je tacno stanje "nudi se, cena nepoznata" -- ne ulazi u
-- min_price i ne prikazuje se kao 0. Dopuniti kad se sazna.
-- =============================================================================

INSERT INTO dog_food_offer (dog_food_id, pet_shop_id, price, is_in_stock)
SELECT f.id, s.id, c.price, 1
FROM (
            SELECT 'pseca-kasika-karabatak-premium-300g'                AS slug,  350 AS price
  UNION ALL SELECT 'pseca-kasika-karabatak-premium-500g-100g-buster',            500
  UNION ALL SELECT 'pseca-kasika-karabatak-superpremium-300g',                   400
  UNION ALL SELECT 'pseca-kasika-karabatak-superpremium-500g-100g-buster',       750
  UNION ALL SELECT 'pseca-kasika-junetina-premium-300g',                         700
  UNION ALL SELECT 'pseca-kasika-junetina-premium-500g-100g-buster',            1200
  UNION ALL SELECT 'pseca-kasika-junetina-superpremium-300g',                    900
  UNION ALL SELECT 'pseca-kasika-junetina-superpremium-500g-100g-buster',       1550
  UNION ALL SELECT 'pseca-kasika-file-premium-300g',                             400
  UNION ALL SELECT 'pseca-kasika-file-premium-500g-100g-buster',                 600
  UNION ALL SELECT 'pseca-kasika-file-superpremium-300g',                        450
  UNION ALL SELECT 'pseca-kasika-file-superpremium-500g-100g-buster',            700
  UNION ALL SELECT 'pseca-kasika-kolagenski-bujon',                              130
  UNION ALL SELECT 'pseca-kasika-buster-juneca-srca-i-papalina-100g',            150
  UNION ALL SELECT 'pseca-kasika-buster-pileca-srca-i-papalina-100g',           NULL
) c
JOIN dog_food f ON f.slug = c.slug
JOIN pet_shop s ON s.slug = 'pseca-kasika-savski-venac'
ON DUPLICATE KEY UPDATE
  price       = VALUES(price),
  is_in_stock = VALUES(is_in_stock);


-- =============================================================================
-- MIN_PRICE  --  denormalizovan MIN(offer.price)
--
-- Isti blok koji drze offers.POST/PATCH/DELETE handleri (vidi db/README.md).
-- Seed upisuje ponude direktno, mimo handlera, pa mora sam da ga pokrene.
-- Tri uslova nisu ukras: ugasena prodavnica ne diktira cenu, artikal kog nema
-- nije ponuda, a NULL je tacno stanje "nema cene".
-- =============================================================================

UPDATE dog_food f
SET f.min_price = (
    SELECT MIN(o.price)
    FROM dog_food_offer o
    INNER JOIN pet_shop s ON s.id = o.pet_shop_id AND s.is_active = 1
    WHERE o.dog_food_id = f.id AND o.is_in_stock = 1 AND o.price IS NOT NULL
)
WHERE f.brand_id = (SELECT id FROM brand WHERE slug = 'pseca-kasika');


-- --- provere -----------------------------------------------------------------
-- 1) Ocekivano: 15 proizvoda, 15 ponuda, 14 sa cenom.
--
-- SELECT
--   (SELECT COUNT(*) FROM dog_food f
--      JOIN brand b ON b.id = f.brand_id
--     WHERE b.slug = 'pseca-kasika')                                      AS proizvoda,
--   (SELECT COUNT(*) FROM dog_food_offer o
--      JOIN pet_shop s ON s.id = o.pet_shop_id
--     WHERE s.slug = 'pseca-kasika-savski-venac')                         AS ponuda,
--   (SELECT COUNT(*) FROM dog_food_offer o
--      JOIN pet_shop s ON s.id = o.pet_shop_id
--     WHERE s.slug = 'pseca-kasika-savski-venac'
--       AND o.price IS NOT NULL)                                          AS sa_cenom
--
-- 2) Proizvod bez ponude znaci da su se slugovi u dve liste razisli --
--    ocekivano je 0 redova:
--
-- SELECT f.slug FROM dog_food f
-- JOIN brand b ON b.id = f.brand_id AND b.slug = 'pseca-kasika'
-- LEFT JOIN dog_food_offer o ON o.dog_food_id = f.id
-- WHERE o.id IS NULL
--
-- 3) Pregled kataloga (i provera da su c/c/z/s prezivela paste):
--
-- SELECT f.name, f.package_weight_g, f.min_price, t.name_sr AS tip
-- FROM dog_food f
-- JOIN brand b ON b.id = f.brand_id AND b.slug = 'pseca-kasika'
-- JOIN food_type t ON t.id = f.food_type_id
-- ORDER BY t.sort_order, f.name
