-- Add payment provider columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT NULL
    CHECK (payment_provider IN ('paddle', 'lemon')),
  ADD COLUMN IF NOT EXISTS provider_customer_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS provider_subscription_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_payment ON profiles(payment_provider)
  WHERE payment_provider IS NOT NULL;
