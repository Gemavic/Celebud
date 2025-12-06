/*
  # Monetization System for CelebUD

  1. New Tables
    - `subscription_tiers`
      - `id` (uuid, primary key)
      - `name` (text) - "Free", "Premium", "VIP"
      - `price_monthly` (numeric) - Monthly price
      - `price_yearly` (numeric) - Yearly price (discounted)
      - `features` (jsonb) - List of features
      - `max_articles_per_month` (integer) - Article limit (null = unlimited)
      - `ad_free` (boolean) - Whether tier includes ad-free experience
      - `early_access` (boolean) - Early access to content
      - `is_active` (boolean)
      - `display_order` (integer)
      - `created_at` (timestamptz)

    - `advertisements`
      - `id` (uuid, primary key)
      - `title` (text)
      - `ad_type` (text) - "banner", "sidebar", "native", "video"
      - `placement` (text) - "header", "sidebar", "article", "footer"
      - `image_url` (text)
      - `link_url` (text)
      - `html_content` (text) - For custom HTML ads
      - `advertiser_name` (text)
      - `click_count` (integer)
      - `impression_count` (integer)
      - `cpm_rate` (numeric) - Cost per 1000 impressions
      - `is_active` (boolean)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `created_at` (timestamptz)

    - `sponsored_content`
      - `id` (uuid, primary key)
      - `content_id` (uuid, foreign key to media_content)
      - `sponsor_name` (text)
      - `sponsor_logo_url` (text)
      - `sponsorship_fee` (numeric)
      - `is_active` (boolean)
      - `start_date` (timestamptz)
      - `end_date` (timestamptz)
      - `created_at` (timestamptz)

    - `affiliate_links`
      - `id` (uuid, primary key)
      - `content_id` (uuid, foreign key to media_content)
      - `product_name` (text)
      - `product_url` (text)
      - `affiliate_url` (text)
      - `image_url` (text)
      - `commission_rate` (numeric)
      - `click_count` (integer)
      - `conversion_count` (integer)
      - `is_active` (boolean)
      - `created_at` (timestamptz)

    - `ad_impressions`
      - `id` (uuid, primary key)
      - `ad_id` (uuid, foreign key)
      - `user_ip` (text)
      - `user_agent` (text)
      - `clicked` (boolean)
      - `created_at` (timestamptz)

    - `newsletter_subscribers`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `name` (text)
      - `is_active` (boolean)
      - `preferences` (jsonb) - Email preferences
      - `subscribed_at` (timestamptz)
      - `unsubscribed_at` (timestamptz)

  2. Updates
    - Add `is_premium` to media_content
    - Add `min_tier_required` to media_content

  3. Security
    - Enable RLS on all tables
    - Add appropriate policies
*/

-- Create subscription_tiers table
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  max_articles_per_month integer,
  ad_free boolean DEFAULT false,
  early_access boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create advertisements table
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  ad_type text DEFAULT 'banner',
  placement text DEFAULT 'sidebar',
  image_url text,
  link_url text,
  html_content text,
  advertiser_name text,
  click_count integer DEFAULT 0,
  impression_count integer DEFAULT 0,
  cpm_rate numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create sponsored_content table
CREATE TABLE IF NOT EXISTS sponsored_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  sponsor_logo_url text,
  sponsorship_fee numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  product_url text,
  affiliate_url text NOT NULL,
  image_url text,
  commission_rate numeric DEFAULT 0,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create ad_impressions table
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid REFERENCES advertisements(id) ON DELETE CASCADE,
  user_ip text,
  user_agent text,
  clicked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create newsletter_subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  is_active boolean DEFAULT true,
  preferences jsonb DEFAULT '{}'::jsonb,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz
);

-- Add columns to media_content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'is_premium'
  ) THEN
    ALTER TABLE media_content ADD COLUMN is_premium boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'min_tier_required'
  ) THEN
    ALTER TABLE media_content ADD COLUMN min_tier_required text DEFAULT 'free';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsored_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Subscription tiers are viewable by everyone"
  ON subscription_tiers FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Active ads are viewable by everyone"
  ON advertisements FOR SELECT
  TO anon
  USING (is_active = true AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Sponsored content is viewable by everyone"
  ON sponsored_content FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Affiliate links are viewable by everyone"
  ON affiliate_links FOR SELECT
  TO anon
  USING (is_active = true);

CREATE POLICY "Newsletter subscribers can view own subscription"
  ON newsletter_subscribers FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can subscribe to newsletter"
  ON newsletter_subscribers FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advertisements_placement ON advertisements(placement, is_active);
CREATE INDEX IF NOT EXISTS idx_advertisements_dates ON advertisements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sponsored_content_active ON sponsored_content(content_id, is_active);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_content ON affiliate_links(content_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- Insert subscription tiers
INSERT INTO subscription_tiers (name, price_monthly, price_yearly, features, max_articles_per_month, ad_free, early_access, display_order) VALUES
  (
    'Free',
    0,
    0,
    '["5 articles per month", "Basic content access", "Email newsletter"]'::jsonb,
    5,
    false,
    false,
    1
  ),
  (
    'Premium',
    9.99,
    99.99,
    '["Unlimited articles", "Ad-free experience", "Premium content access", "Early access to news", "Email newsletter"]'::jsonb,
    null,
    true,
    true,
    2
  ),
  (
    'VIP',
    19.99,
    199.99,
    '["Everything in Premium", "Exclusive interviews", "Behind-the-scenes content", "VIP events access", "Priority support"]'::jsonb,
    null,
    true,
    true,
    3
  )
ON CONFLICT DO NOTHING;

-- Insert sample advertisements
INSERT INTO advertisements (title, ad_type, placement, image_url, link_url, advertiser_name, cpm_rate, end_date) VALUES
  (
    'Fashion Week 2024',
    'banner',
    'header',
    'https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=800',
    'https://example.com/fashion-week',
    'Fashion Brand Co',
    5.00,
    now() + interval '30 days'
  ),
  (
    'Celebrity Beauty Products',
    'sidebar',
    'sidebar',
    'https://images.pexels.com/photos/3785147/pexels-photo-3785147.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://example.com/beauty',
    'Beauty Corp',
    3.50,
    now() + interval '60 days'
  ),
  (
    'Streaming Service Premium',
    'native',
    'article',
    'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
    'https://example.com/streaming',
    'StreamFlix',
    8.00,
    now() + interval '90 days'
  )
ON CONFLICT DO NOTHING;