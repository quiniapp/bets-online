-- ============================================================================
-- Amusnet (EGT) titles — insert/upsert under the REAL provider "scorpioplay"
-- with visible_provider_name = 'amusnet'
-- Target: Supabase SQL Editor (develop / staging)
-- ============================================================================
--
-- Use this script when these games are NOT in the current environment's
-- catalog but 21Viral serves them as providerName='scorpioplay' (which is
-- what the full develop catalog shows for these 16:* IDs).
--
-- The real provider stays 'scorpioplay' for the 21Viral launch; the frontends
-- and the web-admin show them under 'amusnet' through visible_provider_name.
--
-- If 21Viral confirms the real launch provider is 'amusnet', use
-- amusnet-insert.sql instead.
--
-- Requires migration 20261010000001 (games.visible_provider_name).
-- ============================================================================

BEGIN;

INSERT INTO providers (id, name, is_active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'scorpioplay', true, now(), now()),
  (gen_random_uuid(), 'amusnet', true, now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO games (
  id,
  name,
  description,
  is_active,
  min_bet,
  max_bet,
  house_edge,
  provider_name,
  provider_game_id,
  game_type,
  rtp,
  visible_provider_name,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  v.name,
  v.name || ' — synced from scorpioplay',
  true,
  1,
  10000,
  0,
  'scorpioplay',
  v.provider_game_id,
  'Slot',
  95,
  'amusnet',
  now(),
  now()
FROM (VALUES
  ('16:807', 'Zodiac Wheel'),
  ('16:815', 'Witches'' Charm'),
  ('16:562', 'Vampire Night'),
  ('16:5091', 'Vampire Dice'),
  ('16:461', 'Vampire Beast'),
  ('16:802', 'Ultimate Hot'),
  ('16:8038', 'Trophy Rush Triple Boost Golden Coins Link'),
  ('16:5196', 'Triple Fortune Festival'),
  ('16:5124', 'Toad Super Pot'),
  ('16:834', 'The Explorers'),
  ('16:5305', 'Super Crazy Red x1000'),
  ('16:5173', 'Sparta Dice'),
  ('16:5000', 'Shining Crown Buy Bonus'),
  ('16:831', 'Shining Crown'),
  ('16:806', 'Rise of Ra'),
  ('16:5057', 'Porko Wins'),
  ('16:5197', 'Porko Collect Super Pot'),
  ('16:5198', 'Porko Boost Super Pot'),
  ('16:5121', 'Phoenix Star Super Pot'),
  ('16:5156', 'Panda''s Gold'),
  ('16:593', 'Orient Story'),
  ('16:849', 'Lucky Hot'),
  ('16:452', 'Kemet''s Treasures'),
  ('16:640', 'Kemet''s Dice'),
  ('16:5157', 'Kebab Super Pot'),
  ('16:5059', 'Hot Deco Super Pot'),
  ('16:416', 'Greek Fortune'),
  ('16:555', 'Great 27'),
  ('16:482', 'Gorgon''s Luck'),
  ('16:5161', 'Golden Tiger 1000'),
  ('16:5337', 'Golden Tiger'),
  ('16:5163', 'Golden Snake'),
  ('16:5164', 'Golden Ox'),
  ('16:5165', 'Golden Mouse'),
  ('16:811', 'Fruits Kingdom'),
  ('16:417', 'Fruits & Gold'),
  ('16:880', 'Extremely Hot'),
  ('16:822', 'Extra Stars'),
  ('16:777', 'Extra Crown Dice'),
  ('16:5082', 'Extra Crown Classic - Buy Bonus'),
  ('16:492', 'Extra Crown Classic'),
  ('16:446', 'Extra Crown'),
  ('16:5279', 'El Dogiachi 1000'),
  ('16:856', 'Dice of Ra'),
  ('16:613', 'Dice & Roll - Christmas Edition'),
  ('16:824', 'Dice & Roll'),
  ('16:495', 'Diamond Plus Football Edition'),
  ('16:489', 'Diamond Plus - Valentine''s Edition'),
  ('16:402', 'Diamond Plus'),
  ('16:514', 'Coral Island'),
  ('16:5090', 'Cocktail Rush Buy Bonus'),
  ('16:487', 'Cocktail Rush - Easter Edition'),
  ('16:412', 'Cocktail Rush'),
  ('16:486', 'Cocktail Dice'),
  ('16:5054', 'Clover Super Pot'),
  ('16:5020', 'Cherry Cherry Baby'),
  ('16:5283', 'Cheeky Cherry'),
  ('16:5172', 'Cairo Dice'),
  ('16:5178', 'Burning Hot Buy Bonus'),
  ('16:565', 'Burning Hot 6 reels'),
  ('16:801', 'Burning Hot'),
  ('16:842', 'Burning Dice'),
  ('16:5086', 'Bulky Fruits Buy Bonus'),
  ('16:410', 'Bulky Fruits'),
  ('16:443', 'Aztec Forest'),
  ('16:522', 'Amazons'' Story'),
  ('16:480', '7 & Crystals'),
  ('16:490', '5 Power Hot'),
  ('16:557', '5 Juggle Fruits'),
  ('16:553', '5 Great Star'),
  ('16:451', '5 Glossy Hot'),
  ('16:485', '5 Glossy Dice'),
  ('16:609', '5 Extra Crown'),
  ('16:496', '5 Diamond Plus'),
  ('16:810', '5 Dazzling Hot'),
  ('16:532', '5 Burning Heart'),
  ('16:804', '40 Super Hot'),
  ('16:5105', '40 Power Hot Coin Boost'),
  ('16:5169', '40 Golden Coins: Reel Fishing'),
  ('16:5123', '40 Extra Crown Classic Dice'),
  ('16:5084', '40 Extra Crown - Buy Bonus'),
  ('16:5180', '40 Burning Hot Buy Bonus'),
  ('16:529', '40 Burning Hot'),
  ('16:8004', '40 Bulky Fruits Golden Coins Link'),
  ('16:5088', '40 Bulky Fruits Buy Bonus'),
  ('16:428', '40 Bulky Fruits'),
  ('16:5284', '40 Alebrijes Eternal'),
  ('16:803', '20 Super Hot'),
  ('16:5168', '20 Golden Coins: Reel Fishing'),
  ('16:8025', '20 Glossy Hot Golden Coins Link'),
  ('16:5083', '20 Extra Crown - Buy Bonus'),
  ('16:5179', '20 Burning Hot Buy Bonus'),
  ('16:5087', '20 Bulky Fruits Buy Bonus'),
  ('16:5170', '100 Golden Coins: Reel Fishing'),
  ('16:5181', '100 Burning Hot Buy Bonus'),
  ('16:5120', '100 Bulky Dice'),
  ('16:491', '10 Power Hot'),
  ('16:620', '10 Glossy Hot'),
  ('16:533', '10 Burning Heart'),
  ('16:619', '10 Bulky Fruits'),
  ('16:5174', '10 Alebrijes Eternal')
) AS v(provider_game_id, name)
ON CONFLICT (provider_name, provider_game_id) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    game_type = EXCLUDED.game_type,
    rtp = EXCLUDED.rtp,
    visible_provider_name = 'amusnet',
    is_active = true,
    updated_at = now();

COMMIT;

-- Verification: 101 (or the number of games present in this environment).
SELECT COUNT(*) AS games_visible_as_amusnet
FROM games
WHERE provider_name = 'scorpioplay'
  AND visible_provider_name = 'amusnet'
  AND provider_game_id IN ('16:807', '16:815', '16:562', '16:5091', '16:461', '16:802', '16:8038', '16:5196', '16:5124', '16:834', '16:5305', '16:5173', '16:5000', '16:831', '16:806', '16:5057', '16:5197', '16:5198', '16:5121', '16:5156', '16:593', '16:849', '16:452', '16:640', '16:5157', '16:5059', '16:416', '16:555', '16:482', '16:5161', '16:5337', '16:5163', '16:5164', '16:5165', '16:811', '16:417', '16:880', '16:822', '16:777', '16:5082', '16:492', '16:446', '16:5279', '16:856', '16:613', '16:824', '16:495', '16:489', '16:402', '16:514', '16:5090', '16:487', '16:412', '16:486', '16:5054', '16:5020', '16:5283', '16:5172', '16:5178', '16:565', '16:801', '16:842', '16:5086', '16:410', '16:443', '16:522', '16:480', '16:490', '16:557', '16:553', '16:451', '16:485', '16:609', '16:496', '16:810', '16:532', '16:804', '16:5105', '16:5169', '16:5123', '16:5084', '16:5180', '16:529', '16:8004', '16:5088', '16:428', '16:5284', '16:803', '16:5168', '16:8025', '16:5083', '16:5179', '16:5087', '16:5170', '16:5181', '16:5120', '16:491', '16:620', '16:533', '16:619', '16:5174');
