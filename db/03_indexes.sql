-- =============================================================================
-- 03_indexes.sql  --  indeksi
--
-- Odvojeno od 01_schema.sql namerno: indeksi se najcesce menjaju posle
-- EXPLAIN-a nad pravim podacima, pa ovaj fajl smes da pokrenes ponovo bez
-- diranja tabela.
--
-- MySQL nema `CREATE INDEX IF NOT EXISTS` -- ponovno pokretanje na postojecem
-- indeksu vraca "Duplicate key name". To je bezopasno; preskoci taj red.
-- Za brisanje: DROP INDEX ix_ime ON tabela;
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- DOG_FOOD
--
-- Svi indeksi vode sa is_active jer ga svaki javni upit ima u WHERE.
-- id na kraju kompozita je tie-breaker za keyset paginaciju (vidi README).
-- =============================================================================

-- glavni filter kombo: tip hrane + uzrast + velicina rase
CREATE INDEX ix_dog_food_filter
  ON dog_food (is_active, food_type_id, life_stage_id, breed_size_id, id);

-- "sve od ovog brenda"
CREATE INDEX ix_dog_food_brand
  ON dog_food (is_active, brand_id, id);

-- sort/filter po ceni ("najjeftinije prvo", opseg cene)
CREATE INDEX ix_dog_food_price
  ON dog_food (is_active, min_price, id);

-- sort "novo" + <lastmod> u sitemap-u
CREATE INDEX ix_dog_food_recent
  ON dog_food (is_active, created_at, id);

-- default sort liste: ORDER BY name, id -- bez ovoga MySQL radi filesort
CREATE INDEX ix_dog_food_name
  ON dog_food (is_active, name, id);

-- slobodan tekst. Normalizovan sadrzaj (bez dijakritika, lowercase).
-- NAPOMENA: default ft_min_word_len (MyISAM) / innodb_ft_min_token_size je 3,
-- pa termini krace od 3 znaka nista ne vracaju -- zato search handler pada
-- nazad na LIKE za kratke upite.
CREATE FULLTEXT INDEX ft_dog_food_search
  ON dog_food (search_text);


-- =============================================================================
-- DOG_FOOD_IMAGE
-- =============================================================================

-- galerija na detalj strani: sve slike proizvoda, u redosledu
CREATE INDEX ix_dog_food_image_food
  ON dog_food_image (dog_food_id, sort_order);

-- thumbnail glavne slike u listi -- LEFT JOIN ... AND img.is_primary = 1
CREATE INDEX ix_dog_food_image_primary
  ON dog_food_image (dog_food_id, is_primary);


-- =============================================================================
-- PET_SHOP
-- =============================================================================

-- "prodavnice u ovoj opstini"
CREATE INDEX ix_pet_shop_township
  ON pet_shop (is_active, township_id);

-- radius pretraga -- bounding box prefilter radi range scan po ovom indeksu
-- pre nego sto se uopste racuna Haversine (vidi README, sekcija "geo").
CREATE INDEX ix_pet_shop_geo
  ON pet_shop (is_active, latitude, longitude);

-- default sort liste
CREATE INDEX ix_pet_shop_name
  ON pet_shop (is_active, name, id);


-- =============================================================================
-- DOG_FOOD_OFFER
--
-- Dva smera pretrage:
--   uq_dog_food_offer      -> "koje prodavnice drze ovaj proizvod" (vec postoji
--                             kao UNIQUE iz 01_schema.sql, sluzi i kao indeks)
--   ix_dog_food_offer_shop -> "koje proizvode drzi ova prodavnica"
-- =============================================================================

CREATE INDEX ix_dog_food_offer_shop
  ON dog_food_offer (pet_shop_id, is_in_stock);

-- "gde da kupim", sortirano po ceni + recompute MIN(price)
CREATE INDEX ix_dog_food_offer_price
  ON dog_food_offer (dog_food_id, is_in_stock, price);


-- =============================================================================
-- PENDING_DOG_FOOD
-- =============================================================================

-- moderaciona lista: neobradjeni predlozi, najstariji prvi
CREATE INDEX ix_pending_dog_food_queue
  ON pending_dog_food (is_approved, is_declined, created_at);


-- =============================================================================
-- PROVERA -- pokrenuti u Mars SQL konzoli posle punjenja podacima.
-- Ocekivano: `key` je jedan od ix_dog_food_*, bez "Using filesort" na
-- glavnoj pretrazi i bez "Using temporary".
-- =============================================================================

-- EXPLAIN
-- SELECT f.id, f.name, f.slug, f.min_price, b.name AS brand_name
-- FROM dog_food f
-- JOIN brand b ON b.id = f.brand_id
-- LEFT JOIN dog_food_image img ON img.dog_food_id = f.id AND img.is_primary = 1
-- WHERE f.is_active = 1 AND f.food_type_id = 1 AND f.life_stage_id = 2
-- ORDER BY f.name, f.id
-- LIMIT 20;

-- EXPLAIN
-- SELECT o.id, o.price, s.name
-- FROM dog_food_offer o
-- JOIN pet_shop s ON s.id = o.pet_shop_id
-- WHERE o.dog_food_id = 1 AND o.is_in_stock = 1
-- ORDER BY o.price;

-- SHOW INDEX FROM dog_food;
