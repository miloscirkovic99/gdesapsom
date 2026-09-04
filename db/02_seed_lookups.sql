-- =============================================================================
-- 02_seed_lookups.sql  --  lookup vrednosti + primer brenda
--
-- Pokrenuti POSLE 01_schema.sql.
-- Idempotentno: `ON DUPLICATE KEY UPDATE` na UNIQUE(code) / UNIQUE(slug), pa
-- ponovno pokretanje osvezi prevode umesto da pukne.
--
-- `code` je ugovor sa frontendom -- pojavljuje se u URL query parametrima
-- (?type=dry&stage=puppy). Menjati ga znaci lomiti postojece deep linkove.
-- =============================================================================

SET NAMES utf8mb4;


-- --- tip hrane ---------------------------------------------------------------
INSERT INTO food_type (code, name_sr, name_en, sort_order) VALUES
  ('dry',        'Suva hrana',    'Dry food',   1),
  ('wet',        'Vlazna hrana',  'Wet food',   2),
  ('raw',        'Sirova hrana',  'Raw food',   3),
  ('treat',      'Poslastice',    'Treats',     4),
  ('supplement', 'Dodaci ishrani','Supplements',5)
ON DUPLICATE KEY UPDATE
  name_sr = VALUES(name_sr), name_en = VALUES(name_en), sort_order = VALUES(sort_order);


-- --- uzrast ------------------------------------------------------------------
INSERT INTO life_stage (code, name_sr, name_en, sort_order) VALUES
  ('puppy',  'Stene',        'Puppy',      1),
  ('adult',  'Odrastao pas', 'Adult',      2),
  ('senior', 'Stariji pas',  'Senior',     3),
  ('all',    'Svi uzrasti',  'All ages',   4)
ON DUPLICATE KEY UPDATE
  name_sr = VALUES(name_sr), name_en = VALUES(name_en), sort_order = VALUES(sort_order);


-- --- velicina rase -----------------------------------------------------------
INSERT INTO breed_size (code, name_sr, name_en, sort_order) VALUES
  ('small',  'Male rase',    'Small breeds',  1),
  ('medium', 'Srednje rase', 'Medium breeds', 2),
  ('large',  'Velike rase',  'Large breeds',  3),
  ('all',    'Sve rase',     'All breeds',    4)
ON DUPLICATE KEY UPDATE
  name_sr = VALUES(name_sr), name_en = VALUES(name_en), sort_order = VALUES(sort_order);


-- --- brendovi (pocetni set; dopunjuje se kroz admin) -------------------------
INSERT INTO brand (name, slug, website_url) VALUES
  ('Royal Canin', 'royal-canin', 'https://www.royalcanin.com'),
  ('Purina',      'purina',      'https://www.purina.com'),
  ('Acana',       'acana',       'https://www.acana.com'),
  ('Orijen',      'orijen',      'https://www.orijen.ca'),
  ('Hill''s',     'hills',       'https://www.hillspet.com'),
  ('Brit',        'brit',        'https://www.brit-petfood.com'),
  ('Monge',       'monge',       'https://www.monge.it')
ON DUPLICATE KEY UPDATE
  name = VALUES(name), website_url = VALUES(website_url);


-- --- provera -----------------------------------------------------------------
-- SELECT code, name_sr, name_en FROM food_type  ORDER BY sort_order;
-- SELECT code, name_sr, name_en FROM life_stage ORDER BY sort_order;
-- SELECT code, name_sr, name_en FROM breed_size ORDER BY sort_order;
-- SELECT id, name, slug FROM brand ORDER BY name;
