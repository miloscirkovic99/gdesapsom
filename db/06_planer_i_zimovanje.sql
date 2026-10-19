-- =============================================================================
-- gdesapsom / zimske stranice + planer sa psom
-- 06_planer_i_zimovanje.sql
--
-- Pokrenuti posle 01-05. Lepi se u MARS browser DB manager. OBAVEZAN backup.
-- Skripta je ponovljiva: CREATE ... IF NOT EXISTS, INSERT IGNORE, CREATE OR
-- REPLACE VIEW. Radi na MariaDB 10.2.7+ i MySQL 8.0+ (tip JSON).
--
-- Nasledjene tabele (info_ug_obj, parkovi, vetclinics, ...) se NE menjaju.
-- Nova polja zive u 1:1 tabelama "detalja", a pogled planner_mesta ih spaja sa
-- nasledjenim podacima. Kad detalj nije upisan, pogled uzima ono sto vec
-- postoji (koordinate iz info_ug_obj.latitude/longitude, velicinu psa iz
-- starost); NULL znaci "ne znamo" i nigde se ne prikazuje.
--
-- Nazivi kolona su oni iz zadatka (srpski); nazivi tabela ih prate.
-- =============================================================================

SET NAMES utf8mb4;


-- =============================================================================
-- 1. DESTINACIJA -- zimske destinacije. Pravila za gondole i zicare imaju
-- datum provere; bez datuma stranica kaze samo "prema nasim podacima".
-- Koordinate su centar destinacije: za prognozu i "najblizi veterinar".
-- =============================================================================

CREATE TABLE IF NOT EXISTS destinacija (
  id                  INT UNSIGNED        NOT NULL AUTO_INCREMENT,
  slug                VARCHAR(60)         NOT NULL,   -- URL: /zimovanje-sa-psom/<slug>
  naziv               VARCHAR(80)         NOT NULL,
  lat                 DECIMAL(9,6)        NOT NULL,
  lng                 DECIMAL(9,6)        NOT NULL,
  gondola_psi         TINYINT(1)          NULL,
  gondola_provereno   DATE                NULL,
  zicare_psi          TINYINT(1)          NULL,
  zicare_provereno    DATE                NULL,
  staze_zimi          VARCHAR(500)        NULL,   -- kratka napomena o zimskim stazama; same staze su u tabeli staza
  PRIMARY KEY (id),
  UNIQUE KEY uq_destinacija_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO destinacija (slug, naziv, lat, lng) VALUES
  ('kopaonik', 'Kopaonik', 43.285700, 20.809400),
  ('zlatibor', 'Zlatibor', 43.727700, 19.696000),
  ('tara',     'Tara',     43.852600, 19.427800);


-- =============================================================================
-- 2. LOKAL_DETALJI -- 1:1 sa info_ug_obj (kafici, restorani, barovi, smestaj)
--
-- iuo_id je signed INT kao pet_shop.township_id u 01_schema.sql; proveri
-- `SHOW COLUMNS FROM info_ug_obj LIKE 'iuo_id'` pre FK-a sa dna fajla.
-- Smestaj (Hotel, Motel, Apartman) koristi i kolone iz drugog bloka.
-- =============================================================================

CREATE TABLE IF NOT EXISTS lokal_detalji (
  iuo_id              INT                 NOT NULL,
  -- Lokali
  lat                 DECIMAL(9,6)        NULL,   -- prednost nad info_ug_obj.latitude (tekst)
  lng                 DECIMAL(9,6)        NULL,
  kvart               VARCHAR(80)         NULL,   -- "Dorćol", "Liman"; sitnije od opstine
  radno_vreme         JSON                NULL,   -- {"pon":[["08:00","23:00"]], ..., "ned":[]}; vidi db/README.md
  psi_unutra          TINYINT(1)          NULL,
  psi_basta           TINYINT(1)          NULL,
  max_velicina_psa    ENUM('mali','srednji','veliki','svi') NULL,   -- najveci pas koji sme; prednost nad starost
  voda_za_pse         TINYINT(1)          NULL,
  ogradjeno           TINYINT(1)          NULL,
  hlad                TINYINT(1)          NULL,
  cenovni_rang        TINYINT UNSIGNED    NULL,   -- 1 (jeftino) .. 4 (skupo)
  kratak_opis         VARCHAR(200)        NULL,
  premium             TINYINT(1)          NOT NULL DEFAULT 0,   -- samo tie-breaker u planeru
  poslednja_provera   DATE                NULL,
  -- Smestaj
  doplata_za_psa      DECIMAL(10,2)       NULL,
  doplata_valuta      ENUM('RSD','EUR')   NULL,
  doplata_po          ENUM('noc','boravak') NULL,
  max_pasa            TINYINT UNSIGNED    NULL,
  pas_sme_sam_u_sobi  TINYINT(1)          NULL,
  affiliate_url       VARCHAR(500)        NULL,   -- pun URL sa tracking parametrima; uvek rel="sponsored nofollow"
  -- Destinacija za zimovanje (Kopaonik, Zlatibor, Tara); NULL za gradske lokale
  destinacija_id      INT UNSIGNED        NULL,
  updated_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (iuo_id),
  KEY ix_lokal_detalji_destinacija (destinacija_id),
  CONSTRAINT ck_lokal_detalji_rang CHECK (cenovni_rang IS NULL OR cenovni_rang BETWEEN 1 AND 4),
  CONSTRAINT ck_lokal_detalji_doplata CHECK (
    (doplata_za_psa IS NULL AND doplata_valuta IS NULL AND doplata_po IS NULL)
    OR (doplata_za_psa >= 0 AND doplata_valuta IS NOT NULL AND doplata_po IS NOT NULL)
  ),
  CONSTRAINT ck_lokal_detalji_affiliate CHECK (affiliate_url IS NULL OR affiliate_url LIKE 'https://%'),
  CONSTRAINT fk_lokal_detalji_destinacija FOREIGN KEY (destinacija_id) REFERENCES destinacija(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 3. STAZA -- setne staze, svaka sa id-jem i koordinatama, da bi planer mogao
-- da ih predlozi (lokacija_id = 3000000 + id).
-- =============================================================================

CREATE TABLE IF NOT EXISTS staza (
  id                  INT UNSIGNED        NOT NULL AUTO_INCREMENT,
  destinacija_id      INT UNSIGNED        NULL,
  grd_id              INT                 NULL,       -- staza u gradu, bez destinacije
  naziv               VARCHAR(120)        NOT NULL,
  lat                 DECIMAL(9,6)        NOT NULL,   -- pocetak staze
  lng                 DECIMAL(9,6)        NOT NULL,
  duzina_km           DECIMAL(4,1)        NULL,
  opis                VARCHAR(300)        NULL,
  zimi                TINYINT(1)          NOT NULL DEFAULT 1,   -- prohodna zimi
  ogradjeno           TINYINT(1)          NULL,
  hlad                TINYINT(1)          NULL,
  voda_za_pse         TINYINT(1)          NULL,
  poslednja_provera   DATE                NULL,
  is_active           TINYINT(1)          NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY ix_staza_destinacija (destinacija_id, is_active),
  CONSTRAINT fk_staza_destinacija FOREIGN KEY (destinacija_id) REFERENCES destinacija(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 4. Koordinate i pravila parkova i veterinara (1:1 sa parkovi, vetclinics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS park_detalji (
  par_id              INT                 NOT NULL,
  lat                 DECIMAL(9,6)        NULL,
  lng                 DECIMAL(9,6)        NULL,
  ogradjeno           TINYINT(1)          NULL,
  hlad                TINYINT(1)          NULL,
  voda_za_pse         TINYINT(1)          NULL,
  poslednja_provera   DATE                NULL,
  PRIMARY KEY (par_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS veterinar_detalji (
  vetc_id             INT                 NOT NULL,
  lat                 DECIMAL(9,6)        NULL,
  lng                 DECIMAL(9,6)        NULL,
  poslednja_provera   DATE                NULL,
  PRIMARY KEY (vetc_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. PLANER
--
-- planner_plans.id je nasumican javni id (16 znakova, [0-9a-z]) koji ide u
-- link /plan/:id: redni broj bi dao da se tudji planovi pogadjaju redom.
-- Svi DATETIME su UTC; handleri ih upisuju sami, ne oslanjaju se na DEFAULT.
-- =============================================================================

CREATE TABLE IF NOT EXISTS planner_plans (
  id                  CHAR(16)            NOT NULL,
  params_hash         CHAR(64)            NOT NULL,   -- SHA-256 parametara + temperature na 5 °C
  params              JSON                NOT NULL,   -- normalizovani parametri; nikad ime psa
  result              JSON                NOT NULL,   -- plan + atribucija prognoze
  mode                ENUM('dan','zimovanje') NOT NULL,
  provider            VARCHAR(20)         NOT NULL,   -- gemini | cloudflare | anthropic | rules | swap
  model               VARCHAR(80)         NULL,
  tokens_in           INT UNSIGNED        NOT NULL DEFAULT 0,
  tokens_out          INT UNSIGNED        NOT NULL DEFAULT 0,
  cost_usd            DECIMAL(10,6)       NOT NULL DEFAULT 0,   -- ceo zahtev, i neuspeli pokusaji
  created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_planner_plans_cache (params_hash, created_at),
  KEY ix_planner_plans_created (created_at)     -- dnevni zbir cost_usd
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS planner_feedback (
  id                  INT UNSIGNED        NOT NULL AUTO_INCREMENT,
  plan_id             CHAR(16)            NOT NULL,
  rating              TINYINT             NULL,       -- 1 palac gore, -1 palac dole
  comment             VARCHAR(500)        NULL,       -- "Prijavi gresku"
  venue_id            INT                 NULL,       -- lokacija_id na koji se prijava odnosi
  created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_planner_feedback_plan (plan_id),
  KEY ix_planner_feedback_venue (venue_id, created_at),
  CONSTRAINT ck_planner_feedback_rating CHECK (rating IS NULL OR rating IN (-1, 1)),
  CONSTRAINT fk_planner_feedback_plan FOREIGN KEY (plan_id) REFERENCES planner_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Samo HMAC-SHA256 (PLANNER_HMAC_SECRET) uredjaja i mreze; nikad sirova IP
-- adresa ni gsp_device. Dnevni job brise redove starije od 8 dana.
CREATE TABLE IF NOT EXISTS planner_quota (
  id                  BIGINT UNSIGNED     NOT NULL AUTO_INCREMENT,
  device_hash         CHAR(64)            NOT NULL,
  ip_hash             CHAR(64)            NOT NULL,
  plan_id             CHAR(16)            NULL,       -- id plana koji rezervacija placa; handler ga generise pre plana
  created_at          DATETIME(3)         NOT NULL,
  PRIMARY KEY (id),
  KEY ix_planner_quota_device (device_hash, created_at),
  KEY ix_planner_quota_ip (ip_hash, created_at),
  KEY ix_planner_quota_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MET Norway odgovori, cuvani do Expires (najmanje sat vremena).
CREATE TABLE IF NOT EXISTS planner_weather_cache (
  cache_key           VARCHAR(64)         NOT NULL,   -- "met:44.8125,20.4612"
  body                MEDIUMTEXT          NOT NULL,
  last_modified       VARCHAR(64)         NULL,       -- za If-Modified-Since
  expires_at          DATETIME            NOT NULL,
  fetched_at          DATETIME            NOT NULL,
  PRIMARY KEY (cache_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =============================================================================
-- 6. PLANNER_MESTA -- sva mesta koja planer i zimske stranice smeju da
-- ponude, pod jednim lokacija_id:
--     lokal      = iuo_id                (stranica /spots/:id)
--     park       = 1000000 + par_id
--     veterinar  = 2000000 + vetc_id
--     staza      = 3000000 + staza.id
-- kategorija: kafic | restoran | bar | smestaj | park | staza | veterinar.
-- Teretane i "Ostalo" nisu ovde.
--
-- Tekst iz nasledjenih tabela ide kroz CONVERT(... USING utf8mb4) COLLATE
-- utf8mb4_unicode_ci: njihov charset i collation nisu poznati, a UNION sa
-- novim tabelama (utf8mb4_unicode_ci) inace pada sa "Illegal mix of
-- collations" cim se razlikuju (npr. utf8mb4_general_ci, podrazumevani u
-- MariaDB).
-- =============================================================================

CREATE OR REPLACE VIEW planner_mesta AS
SELECT
  iuo.iuo_id                                         AS id,
  'lokal'                                            AS izvor,
  iuo.iuo_id                                         AS izvor_id,
  CONVERT(iuo.iuo_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci AS naziv,
  CASE
    WHEN ugo.ugo_ime IN ('Kafić', 'Kafeterija')      THEN 'kafic'
    WHEN ugo.ugo_ime IN ('Restoran', 'Splav')        THEN 'restoran'
    WHEN ugo.ugo_ime IN ('Bar', 'Pab')               THEN 'bar'
    WHEN ugo.ugo_ime IN ('Hotel', 'Motel', 'Apartman') THEN 'smestaj'
  END                                                AS kategorija,
  CONVERT(grd.grd_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci AS grad,
  CONVERT(NULLIF(TRIM(iuo.iuo_adressa), '') USING utf8mb4) COLLATE utf8mb4_unicode_ci AS adresa,
  d.kvart                                            AS kvart,
  COALESCE(d.lat, CASE
    WHEN REPLACE(TRIM(iuo.latitude), ',', '.') REGEXP '^-?[0-9]{1,3}(\\.[0-9]+)?$'
     AND CAST(REPLACE(TRIM(iuo.latitude), ',', '.') AS DECIMAL(12,8)) BETWEEN 41.8 AND 46.3
    THEN CAST(REPLACE(TRIM(iuo.latitude), ',', '.') AS DECIMAL(9,6)) END) AS lat,
  COALESCE(d.lng, CASE
    WHEN REPLACE(TRIM(iuo.longitude), ',', '.') REGEXP '^-?[0-9]{1,3}(\\.[0-9]+)?$'
     AND CAST(REPLACE(TRIM(iuo.longitude), ',', '.') AS DECIMAL(12,8)) BETWEEN 18.8 AND 23.1
    THEN CAST(REPLACE(TRIM(iuo.longitude), ',', '.') AS DECIMAL(9,6)) END) AS lng,
  d.psi_unutra                                       AS psi_unutra,
  d.psi_basta                                        AS psi_basta,
  COALESCE(d.max_velicina_psa, CASE
    WHEN sta.sta_ime = 'Svi psi' THEN 'svi'
    WHEN sta.sta_ime LIKE 'Mali pas%' THEN 'mali'
  END)                                               AS max_velicina_psa,
  d.radno_vreme                                      AS radno_vreme,
  COALESCE(d.kratak_opis, CONVERT(NULLIF(NULLIF(LEFT(TRIM(iuo.iuo_opis), 200), ''), 'null') USING utf8mb4) COLLATE utf8mb4_unicode_ci) AS kratak_opis,
  COALESCE(d.premium, 0)                             AS premium,
  d.poslednja_provera                                AS poslednja_provera,
  d.voda_za_pse                                      AS voda_za_pse,
  d.hlad                                             AS hlad,
  d.ogradjeno                                        AS ogradjeno,
  d.cenovni_rang                                     AS cenovni_rang,
  d.doplata_za_psa                                   AS doplata_za_psa,
  d.doplata_valuta                                   AS doplata_valuta,
  d.doplata_po                                       AS doplata_po,
  d.max_pasa                                         AS max_pasa,
  d.pas_sme_sam_u_sobi                               AS pas_sme_sam_u_sobi,
  d.affiliate_url                                    AS affiliate_url,
  d.destinacija_id                                   AS destinacija_id,
  CONVERT(NULLIF(TRIM(iuo.iuo_telefon), '') USING utf8mb4) COLLATE utf8mb4_unicode_ci AS telefon
FROM info_ug_obj iuo
JOIN ugo_objekat ugo ON ugo.ugo_id = iuo.ugo_id
JOIN opstina ops     ON ops.ops_id = iuo.ops_id
JOIN grad grd        ON grd.grd_id = ops.grd_id
LEFT JOIN starost sta     ON sta.sta_id = iuo.sta_id
LEFT JOIN lokal_detalji d ON d.iuo_id = iuo.iuo_id
WHERE iuo.iuo_obrisan IS NULL
  AND ugo.ugo_ime IN ('Kafić', 'Kafeterija', 'Restoran', 'Splav', 'Bar', 'Pab', 'Hotel', 'Motel', 'Apartman')

UNION ALL

SELECT
  1000000 + p.par_id, 'park', p.par_id, CONVERT(p.par_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci, 'park', CONVERT(grd.grd_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci,
  CONVERT(NULLIF(TRIM(p.par_lokacija), '') USING utf8mb4) COLLATE utf8mb4_unicode_ci, NULL, pd.lat, pd.lng,
  NULL, NULL, 'svi', NULL,
  CONVERT(NULLIF(NULLIF(LEFT(TRIM(p.par_opis), 200), ''), 'null') USING utf8mb4) COLLATE utf8mb4_unicode_ci,
  0, pd.poslednja_provera, pd.voda_za_pse, pd.hlad, pd.ogradjeno, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL
FROM parkovi p
JOIN opstina ops ON ops.ops_id = p.ops_id
JOIN grad grd    ON grd.grd_id = ops.grd_id
LEFT JOIN park_detalji pd ON pd.par_id = p.par_id
WHERE p.par_accepted = 1 AND COALESCE(p.par_declined, 0) = 0

UNION ALL

SELECT
  2000000 + v.vetc_id, 'veterinar', v.vetc_id, CONVERT(v.vetc_naziv USING utf8mb4) COLLATE utf8mb4_unicode_ci, 'veterinar', CONVERT(grd.grd_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci,
  CONVERT(NULLIF(TRIM(v.vetc_adresa), '') USING utf8mb4) COLLATE utf8mb4_unicode_ci, NULL, vd.lat, vd.lng,
  NULL, NULL, NULL, NULL, NULL,
  0, vd.poslednja_provera, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, NULL, CONVERT(NULLIF(TRIM(v.vetc_telefon), '') USING utf8mb4) COLLATE utf8mb4_unicode_ci
FROM vetclinics v
JOIN grad grd ON grd.grd_id = v.grd_id
LEFT JOIN veterinar_detalji vd ON vd.vetc_id = v.vetc_id
WHERE v.vetc_isdeleted IS NULL

UNION ALL

SELECT
  3000000 + s.id, 'staza', s.id, s.naziv, 'staza', CONVERT(grd.grd_ime USING utf8mb4) COLLATE utf8mb4_unicode_ci,
  NULL, NULL, s.lat, s.lng,
  NULL, NULL, 'svi', NULL, s.opis,
  0, s.poslednja_provera, s.voda_za_pse, s.hlad, s.ogradjeno, NULL,
  NULL, NULL, NULL, NULL, NULL, NULL, s.destinacija_id, NULL
FROM staza s
LEFT JOIN grad grd ON grd.grd_id = s.grd_id
WHERE s.is_active = 1 AND s.zimi = 1;


-- =============================================================================
-- 7. FK na nasledjene tabele -- pokrenuti ODVOJENO, posle provere tipova
-- (isto kao kraj 01_schema.sql). Ako je iuo_id / par_id / vetc_id
-- `int(10) unsigned`, prvo uskladi kolone ovde (MODIFY ... INT UNSIGNED).
--
--     SHOW COLUMNS FROM info_ug_obj LIKE 'iuo_id';
--     SHOW COLUMNS FROM parkovi     LIKE 'par_id';
--     SHOW COLUMNS FROM vetclinics  LIKE 'vetc_id';
--
-- ALTER TABLE lokal_detalji     ADD CONSTRAINT fk_lokal_detalji_lokal  FOREIGN KEY (iuo_id)  REFERENCES info_ug_obj(iuo_id);
-- ALTER TABLE park_detalji      ADD CONSTRAINT fk_park_detalji_park    FOREIGN KEY (par_id)  REFERENCES parkovi(par_id);
-- ALTER TABLE veterinar_detalji ADD CONSTRAINT fk_veterinar_detalji_vet FOREIGN KEY (vetc_id) REFERENCES vetclinics(vetc_id);
-- =============================================================================
