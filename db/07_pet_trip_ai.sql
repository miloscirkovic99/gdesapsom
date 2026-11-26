-- =============================================================================
-- 07_pet_trip_ai.sql  --  limiti i keš za AI objašnjenje "Putovanje sa psom"
--
-- Koristi ih samo apps/api/v2/pet-trip/insights.POST.js. Bez ovih tabela
-- handler ne zove model (vraća status "unavailable"), pa je redosled:
-- prvo ovaj fajl, pa PET_TRIP_AI_ENABLED=true u Mars podešavanjima.
--
-- Nezavisno od 01–06: ove tabele nemaju veze sa ostalim tabelama.
--
-- Lični podaci: nijedna kolona ne čuva IP adresu, id uređaja ni sadržaj forme.
-- `bucket` je 'global' ili SHA-256 heš sa tajnom solju:
--   uređaj  so | device | id   (period 'total', ili dan uz PET_TRIP_AI_DEVICE_WINDOW=day)
--   mreža   so | ip | IP | dan (period = taj UTC dan)
-- Heš se ne može vratiti u adresu ili id. Keš čuva samo validirano AI
-- objašnjenje, pod hešom zahteva. Handler sam briše dnevne brojače starije od
-- 35 dana, brojače uređaja nekorišćene 400 dana i keš stariji od 30 dana.
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS pet_trip_ai_usage (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  period        VARCHAR(10)  NOT NULL,             -- 'YYYY-MM-DD' (UTC) ili 'total'
  bucket        CHAR(64)     NOT NULL,             -- 'global' ili heš uređaja / mreže
  request_count INT          NOT NULL DEFAULT 0,   -- signed: povraćaj radi GREATEST(0, n - 1)
  updated_at    DATETIME     NOT NULL,             -- UTC, upisuje handler
  PRIMARY KEY (id),
  UNIQUE KEY uq_pet_trip_ai_usage (period, bucket),
  KEY ix_pet_trip_ai_usage_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pet_trip_ai_cache (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_hash  CHAR(64)     NOT NULL,             -- SHA-256(model | zahtev)
  model         VARCHAR(64)  NOT NULL,
  response_json MEDIUMTEXT   NOT NULL,             -- validiran izlaz, ne sirov odgovor modela
  created_at    DATETIME     NOT NULL,             -- UTC, upisuje handler
  PRIMARY KEY (id),
  UNIQUE KEY uq_pet_trip_ai_cache_hash (request_hash),
  KEY ix_pet_trip_ai_cache_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
