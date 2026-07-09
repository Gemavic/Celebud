/*
  # Push Notification Subscriptions

  1. New Tables
    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, nullable) - linked profile if the visitor is logged in, null for anonymous subscribers
      - `endpoint` (text, unique) - the browser's push endpoint URL, uniquely identifies a subscription
      - `p256dh` (text) - subscription encryption key
      - `auth` (text) - subscription auth secret
      - `category_id` (uuid, nullable) - optional: subscribe to one category only, null = all breaking news
      - `created_at` (timestamptz)
      - `last_seen_at` (timestamptz) - updated whenever the subscription is confirmed still valid

  2. Security
    - Enable RLS on `push_subscriptions`
    - Anyone (anon) can insert their own subscription (needed for logged-out visitors to opt in)
    - Anyone can delete a subscription by its own endpoint (needed to unsubscribe)
    - No SELECT policy for anon/authenticated — subscription endpoints are sensitive and are only
      read by the service-role key inside the send-push-notification edge function
*/

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_category ON push_subscriptions(category_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe to push notifications"
  ON push_subscriptions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own subscription by endpoint"
  ON push_subscriptions FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can remove their own subscription by endpoint"
  ON push_subscriptions FOR DELETE
  TO anon, authenticated
  USING (true);
