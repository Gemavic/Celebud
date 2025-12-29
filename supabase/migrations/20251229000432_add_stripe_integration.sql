-- Add Stripe Integration Support
--
-- 1. Changes to existing tables
--    - Add stripe_customer_id to profiles table for linking Stripe customers
--    - Add stripe_subscription_id to profiles table for tracking active subscriptions
--    - Add stripe_price_id_monthly to subscription_tiers for monthly Stripe prices
--    - Add stripe_price_id_yearly to subscription_tiers for yearly Stripe prices
--    - Add current_tier_id to profiles to track user subscription tier
--
-- 2. New Tables
--    - user_subscriptions: tracks active subscriptions with Stripe data
--
-- 3. Security
--    - Enable RLS on user_subscriptions table
--    - Add policies for users to view their own subscriptions
--
-- 4. Indexes
--    - Add indexes for fast lookups and webhook processing

-- Add Stripe fields to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_customer_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN stripe_subscription_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'current_tier_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN current_tier_id uuid REFERENCES subscription_tiers(id);
  END IF;
END $$;

-- Add Stripe price IDs to subscription_tiers table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tiers' AND column_name = 'stripe_price_id_monthly'
  ) THEN
    ALTER TABLE subscription_tiers ADD COLUMN stripe_price_id_monthly text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscription_tiers' AND column_name = 'stripe_price_id_yearly'
  ) THEN
    ALTER TABLE subscription_tiers ADD COLUMN stripe_price_id_yearly text;
  END IF;
END $$;

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tier_id uuid REFERENCES subscription_tiers(id) NOT NULL,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_subscriptions
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for service role to insert subscriptions (for webhooks)
CREATE POLICY "Service role can insert subscriptions"
  ON user_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy for service role to update subscriptions (for webhooks)
CREATE POLICY "Service role can update subscriptions"
  ON user_subscriptions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_sub_id ON user_subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_cust_id ON user_subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();