-- =============================================================================
-- 04_seed_pet_shops.sql  --  prve prodavnice
--
-- Pokrenuti POSLE 01_schema.sql (tabela pet_shop mora da postoji).
-- Nezavisno od 02_seed_lookups.sql -- ne dira dog_food ni lookup tabele.
--
-- Idempotentno: UNIQUE(slug) + ON DUPLICATE KEY UPDATE, pa ponovno pokretanje
-- osvezi podatke umesto da pukne na duplikatu.
--
-- township_id = 7 je Savski venac u ovoj bazi (potvrdjeno rucno). Ako seed ide
-- na drugu instancu, prvo proveri:
--     SELECT ops_id, ops_ime FROM opstina WHERE ops_ime LIKE '%venac%'
--
-- Slug je isti onaj koji bi generisao pet-shops/create.POST.js:
-- normalizeText(name + ' ' + ops_ime) -> 'pseca-kasika-savski-venac'.
-- Pisan je rucno, ASCII, i ne sme da se menja -- vec je deo URL-a.
--
-- PAZNJA na encoding: `name`, `address` i `description` sadrze c/c/z/s. Fajl je
-- UTF-8 i pocinje sa SET NAMES utf8mb4, ali ako ga lepis u Mars browser DB
-- manager, pokreni proveru sa dna i pogledaj da li se ime ispisuje ispravno.
-- =============================================================================

SET NAMES utf8mb4;


-- --- Pseca Kasika (Senjak, Savski venac) --------------------------------------
-- Izvor: https://psecakasika.rs/  (kuvana hrana za pse, prodaja na licu mesta)
-- Radno vreme ide u description -- pet_shop nema kolonu za to.
-- Koordinate: Koste Glavinica 2, ~44.7953 / 20.4422.

INSERT INTO pet_shop
  (name, slug, address, township_id, phone, website_url, description,
   latitude, longitude, wolt_url, glovo_url, is_active)
VALUES (
  'Pseća Kašika',
  'pseca-kasika-savski-venac',
  'Koste Glavinića 2, Poslovni centar "Sajam", Senjak',
  7,
  '+381665469171',
  'https://psecakasika.rs/',
  'Kuvana hrana za pse od svežih namirnica pripremljenih na pari - meso, integralni pirinač, povrće i kolagenski bujon kuvan 12 sati od junećih i pilećih kostiju. Radno vreme: ponedeljak-subota 11:30-19:00, nedelja i praznici 12:00-17:00.',
  44.7953068,
  20.4422092,
  'https://wolt.com/sr/srb/belgrade/venue/psea-kaika',
  NULL,
  1
)
ON DUPLICATE KEY UPDATE
  name        = VALUES(name),
  address     = VALUES(address),
  township_id = VALUES(township_id),
  phone       = VALUES(phone),
  website_url = VALUES(website_url),
  description = VALUES(description),
  latitude    = VALUES(latitude),
  longitude   = VALUES(longitude),
  wolt_url    = VALUES(wolt_url),
  is_active   = VALUES(is_active);


-- --- provera -----------------------------------------------------------------
-- Ocekivano: jedan red, opstina "Savski venac", ime sa ispravnim c/c/z/s.
--
-- SELECT s.id, s.name, s.slug, s.address, ops.ops_ime AS opstina,
--        s.latitude, s.longitude, s.is_active
-- FROM pet_shop s
-- JOIN opstina ops ON ops.ops_id = s.township_id
-- WHERE s.slug = 'pseca-kasika-savski-venac'
