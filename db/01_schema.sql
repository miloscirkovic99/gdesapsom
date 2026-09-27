-- =============================================================================
-- gdesapsom / katalog hrane za pse + petshopovi
-- 01_schema.sql  --  tabele
--
-- Pokretati redom: 01_schema.sql -> 02_seed_lookups.sql -> 03_indexes.sql
-- Lepi se u MARS browser DB manager. OBAVEZAN backup pre pokretanja.
--
-- Konvencija (vazi SAMO za nove tabele):
--   tabela: engleski, jednina, snake_case   |  PK je uvek `id`
--   FK:     <tabela>_id                     |  kolone bez prefiksa tabele
--   bool:   is_ / has_                      |  vreme: created_at / updated_at
--
-- Nasledjene tabele (info_ug_obj, opstina, grad, basta, starost, ugo_objekat,
-- parkovi, posts ...) se NE diraju. Jedina tacka dodira je
-- pet_shop.township_id -> opstina(ops_id); vidi ALTER na dnu fajla.
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- LOOKUP TABELE
--
-- `code` je stabilan kljuc: koristi se u filterima, URL query parametrima i
-- logici, i NIKAD se ne prevodi. `name_sr` / `name_en` znace da nov red u bazi
-- odmah radi u UI-ju bez frontend deploya -- za razliku od danasnjeg
-- map.helpers.ts koji mapira srpski string iz baze u i18n kljuc, pa nova
-- vrednost renderuje prazno.
-- =============================================================================

CREATE TABLE IF NOT EXISTS food_type (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)      NOT NULL,
  name_sr    VARCHAR(80)      NOT NULL,
  name_en    VARCHAR(80)      NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_food_type_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS life_stage (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)      NOT NULL,
  name_sr    VARCHAR(80)      NOT NULL,
  name_en    VARCHAR(80)      NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_life_stage_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS breed_size (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  code       VARCHAR(40)      NOT NULL,
  name_sr    VARCHAR(80)      NOT NULL,
  name_en    VARCHAR(80)      NOT NULL,
  sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_breed_size_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- BRAND
-- logo je URL, ne base64 -- logotipi su mali i sluze i kao og:image fallback
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL,
  logo_url    VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 1,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_brand_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DOG_FOOD -- proizvod. Uska tabela, BEZ blobova.
--
-- min_price je denormalizovan MIN(dog_food_offer.price) da lista ne mora
-- korelisani subquery po redu; recomputuje ga write handler na svaki upis u
-- dog_food_offer (vidi db/README.md, sekcija "min_price").
--
-- search_text je name + brand bez dijakritika, lowercase; puni ga write
-- handler istom normalizacijom koju frontend vec koristi u
-- shared/utils/township.util.ts (plus mapa za dj, koje NFD ne razlaze), pa
-- pretraga "zitarica" nalazi "zitarica".
-- =============================================================================

CREATE TABLE IF NOT EXISTS dog_food (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name             VARCHAR(200)  NOT NULL,
  slug             VARCHAR(220)  NOT NULL,
  brand_id         INT UNSIGNED  NOT NULL,
  food_type_id     INT UNSIGNED  NOT NULL,
  life_stage_id    INT UNSIGNED  NOT NULL,
  breed_size_id    INT UNSIGNED  NOT NULL,
  description      TEXT          NULL,
  ingredients      TEXT          NULL,
  package_weight_g INT UNSIGNED  NULL,
  is_grain_free    TINYINT(1)    NOT NULL DEFAULT 0,
  min_price        DECIMAL(10,2) NULL,
  search_text      VARCHAR(500)  NOT NULL DEFAULT '',
  is_active        TINYINT(1)    NOT NULL DEFAULT 1,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dog_food_slug (slug),
  CONSTRAINT fk_dog_food_brand      FOREIGN KEY (brand_id)      REFERENCES brand(id),
  CONSTRAINT fk_dog_food_type       FOREIGN KEY (food_type_id)  REFERENCES food_type(id),
  CONSTRAINT fk_dog_food_life_stage FOREIGN KEY (life_stage_id) REFERENCES life_stage(id),
  CONSTRAINT fk_dog_food_breed_size FOREIGN KEY (breed_size_id) REFERENCES breed_size(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DOG_FOOD_IMAGE -- glavna optimizacija.
--
-- Danas jedan spot nosi ~187KB base64 u svojoj koloni, pa `limit=500` vrati
-- ~40MB (tools/generate-sitemap.mjs). Izdvajanjem slika u zasebnu tabelu lista
-- selektuje SAMO thumbnail_base64 glavne slike (~10-20KB), a detalj selektuje
-- image_base64. To je razlog zasto base64 sme da ostane.
--
-- PRAVILO: nijedan list/search upit nikad ne selektuje image_base64.
-- =============================================================================

CREATE TABLE IF NOT EXISTS dog_food_image (
  id               INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  dog_food_id      INT UNSIGNED     NOT NULL,
  sort_order       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  is_primary       TINYINT(1)       NOT NULL DEFAULT 0,
  alt_text         VARCHAR(200)     NULL,
  image_base64     LONGTEXT         NOT NULL,
  thumbnail_base64 MEDIUMTEXT       NULL,
  created_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_dog_food_image_food FOREIGN KEY (dog_food_id)
    REFERENCES dog_food(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- PET_SHOP -- prodavnica.
-- latitude/longitude su DECIMAL, ne string kao kod info_ug_obj.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pet_shop (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name        VARCHAR(200)  NOT NULL,
  slug        VARCHAR(220)  NOT NULL,
  address     VARCHAR(300)  NOT NULL,
  township_id INT           NOT NULL,   -- -> opstina(ops_id); vidi ALTER na dnu
  phone       VARCHAR(50)   NULL,
  website_url VARCHAR(500)  NULL,
  description TEXT          NULL,
  latitude    DECIMAL(10,7) NULL,
  longitude   DECIMAL(10,7) NULL,
  wolt_url    VARCHAR(500)  NULL,       -- prodavnica na Woltu
  glovo_url   VARCHAR(500)  NULL,
  logo_base64 MEDIUMTEXT    NULL,       -- mali logo; nikad u list upitu
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pet_shop_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- DOG_FOOD_OFFER -- M2M sa cenom i delivery linkom.
-- Ime govori sta red znaci: ova prodavnica nudi ovaj proizvod, po ovoj ceni.
-- UNIQUE (dog_food_id, pet_shop_id) usput sprecava duplirane parove i daje
-- INSERT ... ON DUPLICATE KEY UPDATE upsert.
-- =============================================================================

CREATE TABLE IF NOT EXISTS dog_food_offer (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  dog_food_id INT UNSIGNED  NOT NULL,
  pet_shop_id INT UNSIGNED  NOT NULL,
  price       DECIMAL(10,2) NULL,
  is_in_stock TINYINT(1)    NOT NULL DEFAULT 1,
  wolt_url    VARCHAR(500)  NULL,   -- deep link do bas tog proizvoda
  glovo_url   VARCHAR(500)  NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_dog_food_offer (dog_food_id, pet_shop_id),
  CONSTRAINT fk_offer_food FOREIGN KEY (dog_food_id) REFERENCES dog_food(id) ON DELETE CASCADE,
  CONSTRAINT fk_offer_shop FOREIGN KEY (pet_shop_id) REFERENCES pet_shop(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- PENDING_DOG_FOOD -- korisnicki predlozi, isti tok kao pr_info_obj za spots.
-- Namerno labava (bez FK na lookup-e): predlog sme da bude nepotpun.
-- =============================================================================

CREATE TABLE IF NOT EXISTS pending_dog_food (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name             VARCHAR(200)  NOT NULL,
  brand_name       VARCHAR(120)  NULL,
  brand_id         INT UNSIGNED  NULL,
  food_type_id     INT UNSIGNED  NULL,
  life_stage_id    INT UNSIGNED  NULL,
  breed_size_id    INT UNSIGNED  NULL,
  description      TEXT          NULL,
  ingredients      TEXT          NULL,
  package_weight_g INT UNSIGNED  NULL,
  is_grain_free    TINYINT(1)    NOT NULL DEFAULT 0,
  image_base64     LONGTEXT      NULL,
  shop_name        VARCHAR(200)  NULL,
  price            DECIMAL(10,2) NULL,
  submitter_email  VARCHAR(200)  NULL,
  is_approved      TINYINT(1)    NOT NULL DEFAULT 0,
  is_declined      TINYINT(1)    NOT NULL DEFAULT 0,
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- FK na nasledjenu tabelu -- pokrenuti ODVOJENO, posle provere.
--
-- InnoDB trazi da tip kolone tacno odgovara roditelju (signed/unsigned,
-- sirina). Tacan tip opstina.ops_id se ne vidi iz ovog repo-a, pa je
-- pet_shop.township_id gore definisan kao signed INT -- najcesci slucaj za
-- legacy `int(11)` seme.
--
-- Proveri pre pokretanja:
--     SHOW COLUMNS FROM opstina LIKE 'ops_id';
--
-- Ako je `int(10) unsigned`, prvo uskladi kolonu:
--     ALTER TABLE pet_shop MODIFY township_id INT UNSIGNED NOT NULL;
--
-- Pa tek onda:
-- =============================================================================

ALTER TABLE pet_shop
  ADD CONSTRAINT fk_pet_shop_township
  FOREIGN KEY (township_id) REFERENCES opstina(ops_id);
