-- ============================================================================
-- Rebrand Scorpio Play games under their real sub-provider (PRODUCTION)
-- ============================================================================
-- Games keep provider_name='scorpioplay' (what 21Viral uses to launch).
-- visible_provider_name is derived from the prefix of provider_game_id, so the
-- frontends and web-admin group them under the actual studio.
--
-- Prefix -> slug map (confirm these before running):
--   2  -> egt       (EGT Digital)
--   3  -> pgsoft    (PG Soft)
--   4  -> booongo   (Booongo)
--   5  -> jili      (JiLi)
--   7  -> cq9       (CQ9)
--   12 -> spribe    (Spribe)
--   13 -> amatic    (Amatic)
--   14 -> inout     (Inout)
--   16 -> amusnet   (Amusnet)
--   17 -> hacksaw   (Hacksaw)
--
-- NOT touched: prefix 1 (Pragmatic Play), 6 (Habanero), 15 (unmapped).
-- ============================================================================

BEGIN;

-- 1. Provider rows (idempotent)
INSERT INTO providers (id, name, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'egt',      true, now(), now()),
  (gen_random_uuid(), 'pgsoft',   true, now(), now()),
  (gen_random_uuid(), 'booongo',  true, now(), now()),
  (gen_random_uuid(), 'jili',     true, now(), now()),
  (gen_random_uuid(), 'cq9',      true, now(), now()),
  (gen_random_uuid(), 'spribe',   true, now(), now()),
  (gen_random_uuid(), 'amatic',   true, now(), now()),
  (gen_random_uuid(), 'inout',    true, now(), now()),
  (gen_random_uuid(), 'amusnet',  true, now(), now()),
  (gen_random_uuid(), 'hacksaw',  true, now(), now())
ON CONFLICT (name) DO NOTHING;

-- 2. Rebrand by prefix (covers ALL games of each sub-provider)
UPDATE games
SET visible_provider_name = CASE split_part(provider_game_id, ':', 1)
       WHEN '2'  THEN 'egt'
       WHEN '3'  THEN 'pgsoft'
       WHEN '4'  THEN 'booongo'
       WHEN '5'  THEN 'jili'
       WHEN '7'  THEN 'cq9'
       WHEN '12' THEN 'spribe'
       WHEN '13' THEN 'amatic'
       WHEN '14' THEN 'inout'
       WHEN '16' THEN 'amusnet'
       WHEN '17' THEN 'hacksaw'
     END,
     updated_at = now()
WHERE provider_name = 'scorpioplay'
  AND split_part(provider_game_id, ':', 1) IN ('2','3','4','5','7','12','13','14','16','17');

COMMIT;

-- ============================================================================
-- Verification: sub-providers should appear; scorpioplay should drop to the
-- games still unmapped (prefixes 1, 6, 15).
-- ============================================================================
SELECT COALESCE(visible_provider_name, provider_name) AS provider,
       COUNT(*) AS games
FROM games
WHERE provider_name = 'scorpioplay'
GROUP BY 1
ORDER BY 2 DESC;

-- ============================================================================
-- Rollback (if needed): clear the overrides for these prefixes only.
-- ============================================================================
-- BEGIN;
-- UPDATE games
-- SET visible_provider_name = NULL,
--     updated_at = now()
-- WHERE provider_name = 'scorpioplay'
--   AND split_part(provider_game_id, ':', 1) IN ('2','3','4','5','7','12','13','14','16','17');
-- COMMIT;
