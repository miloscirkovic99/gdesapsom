-- =============================================================================
-- 10_assistant_ai.sql  --  limiti i keš AI tumačenja poruka pomoćnika (bubble chat)
--
-- Koristi ih samo apps/api/v2/assistant/parse.POST.js. Bez ovih tabela
-- handler ne zove model (vraća status "unavailable"), a pomoćnik na portalu
-- i dalje radi sa svojim tumačenjem. Redosled: prvo ovaj fajl, pa
-- ASSISTANT_AI_ENABLED=true u Mars podešavanjima, pa `assistantAi: true` u
-- env fajlu portala (docs/assistant/README.md).
--
-- Nezavisno od 01–09: ove tabele nemaju veze sa ostalim tabelama.
--
-- Lični podaci: nijedna kolona ne čuva IP adresu, id uređaja ni tekst poruke.
-- `bucket` je 'global' ili SHA-256 heš sa tajnom solju:
--   uređaj  so | assistant-device | id       (period = UTC dan)
--   mreža   so | assistant-ip | IP | dan     (period = UTC dan)
-- Keš čuva samo provereno tumačenje (vrste mesta, nazive mesta, datume),
-- pod hešom poruke. Handler sam briše brojače starije od 35 dana i keš
-- stariji od 30 dana.
-- =============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS assistant_ai_usage (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  period        VARCHAR(10)  NOT NULL,             
  bucket        CHAR(64)     NOT NULL,             
  request_count INT          NOT NULL DEFAULT 0,   
  updated_at    DATETIME     NOT NULL,           
  PRIMARY KEY (id),
  UNIQUE KEY uq_assistant_ai_usage (period, bucket),
  KEY ix_assistant_ai_usage_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS assistant_ai_cache (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  request_hash  CHAR(64)     NOT NULL,            
  model         VARCHAR(64)  NOT NULL,
  response_json TEXT         NOT NULL,            
  created_at    DATETIME     NOT NULL,             
  PRIMARY KEY (id),
  UNIQUE KEY uq_assistant_ai_cache_hash (request_hash),
  KEY ix_assistant_ai_cache_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
