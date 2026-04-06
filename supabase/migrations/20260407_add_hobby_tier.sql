-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add Hobby tier ($19/mo) between Free and Starter
--
-- New tier numbering:
--   1 = Free      (unchanged)
--   2 = Hobby     (NEW — $19/mo)
--   3 = Starter   (was 2 — $49/mo)
--   4 = Professional (was 3 — $99/mo)
--   5 = Enterprise S (was 4 — $249/mo)
--   6 = Enterprise M (was 5 — $499/mo)
--   7 = Enterprise L (was 6 — Custom)
-- ─────────────────────────────────────────────────────────────────────────────

-- Shift all existing paid tiers up by 1 to make room for Hobby (2)
UPDATE profiles
SET subscription_tier = subscription_tier + 1
WHERE subscription_tier >= 2;
