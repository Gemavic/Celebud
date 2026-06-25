-- ============================================================
-- Fix Schema Drift: Align database with frontend expectations
-- ============================================================

-- 1. FIX COMMENTS TABLE
ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='body') THEN
    ALTER TABLE comments RENAME COLUMN body TO content;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. COMMENT_REACTIONS TABLE
CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type text,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user ON comment_reactions(user_id);
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_reactions_public_read" ON comment_reactions;
CREATE POLICY "comment_reactions_public_read" ON comment_reactions
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "comment_reactions_authenticated_insert" ON comment_reactions;
CREATE POLICY "comment_reactions_authenticated_insert" ON comment_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_reactions_own_delete" ON comment_reactions;
CREATE POLICY "comment_reactions_own_delete" ON comment_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 3. FIX PROFILES TABLE
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
UPDATE profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 4. FIX EDITORIAL_FEATURES TABLE
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS editorial_description text;
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS call_to_action text DEFAULT 'Join the discussion';
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS discussion_enabled boolean DEFAULT true;
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS engagement_goal text;
ALTER TABLE editorial_features ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. EDITORIAL_DISCUSSIONS TABLE
CREATE TABLE IF NOT EXISTS editorial_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES editorial_features(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  parent_id uuid REFERENCES editorial_discussions(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_editorial_discussions_feature ON editorial_discussions(feature_id);
ALTER TABLE editorial_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "editorial_discussions_public_read" ON editorial_discussions;
CREATE POLICY "editorial_discussions_public_read" ON editorial_discussions
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "editorial_discussions_authenticated_insert" ON editorial_discussions;
CREATE POLICY "editorial_discussions_authenticated_insert" ON editorial_discussions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "editorial_discussions_own_update" ON editorial_discussions;
CREATE POLICY "editorial_discussions_own_update" ON editorial_discussions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "editorial_discussions_own_delete" ON editorial_discussions;
CREATE POLICY "editorial_discussions_own_delete" ON editorial_discussions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. ADVERTISEMENTS TABLE
CREATE TABLE IF NOT EXISTS advertisements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  ad_type text DEFAULT 'banner',
  placement text DEFAULT 'header',
  image_url text,
  link_url text,
  advertiser_name text,
  cpm_rate numeric DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz DEFAULT now() + interval '30 days',
  is_active boolean DEFAULT true,
  impression_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ads_active_placement ON advertisements(placement, is_active) WHERE is_active = true;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ads_public_read" ON advertisements;
CREATE POLICY "ads_public_read" ON advertisements
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "ads_admin_insert" ON advertisements;
CREATE POLICY "ads_admin_insert" ON advertisements
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "ads_admin_update" ON advertisements;
CREATE POLICY "ads_admin_update" ON advertisements
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "ads_admin_delete" ON advertisements;
CREATE POLICY "ads_admin_delete" ON advertisements
  FOR DELETE TO authenticated USING (is_admin());

-- 7. AD_IMPRESSIONS TABLE
CREATE TABLE IF NOT EXISTS ad_impressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES advertisements(id) ON DELETE CASCADE,
  user_agent text,
  user_ip text,
  clicked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad ON ad_impressions(ad_id);
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_impressions_public_insert" ON ad_impressions;
CREATE POLICY "ad_impressions_public_insert" ON ad_impressions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "ad_impressions_public_read" ON ad_impressions;
CREATE POLICY "ad_impressions_public_read" ON ad_impressions
  FOR SELECT TO anon, authenticated USING (true);

-- 8. SUBSCRIPTION_TIERS TABLE
CREATE TABLE IF NOT EXISTS subscription_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  ad_free boolean DEFAULT false,
  early_access boolean DEFAULT false,
  is_active boolean DEFAULT true,
  stripe_price_id text,
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subscription_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscription_tiers_public_read" ON subscription_tiers;
CREATE POLICY "subscription_tiers_public_read" ON subscription_tiers
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "subscription_tiers_admin_insert" ON subscription_tiers;
CREATE POLICY "subscription_tiers_admin_insert" ON subscription_tiers
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "subscription_tiers_admin_update" ON subscription_tiers;
CREATE POLICY "subscription_tiers_admin_update" ON subscription_tiers
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "subscription_tiers_admin_delete" ON subscription_tiers;
CREATE POLICY "subscription_tiers_admin_delete" ON subscription_tiers
  FOR DELETE TO authenticated USING (is_admin());

INSERT INTO subscription_tiers (name, description, price_monthly, price_yearly, features, ad_free, early_access, display_order)
SELECT 'Free', 'Basic access', 0, 0, '["5 articles per month","Basic content access","Email newsletter"]'::jsonb, false, false, 1
WHERE NOT EXISTS (SELECT 1 FROM subscription_tiers WHERE name = 'Free');

INSERT INTO subscription_tiers (name, description, price_monthly, price_yearly, features, ad_free, early_access, display_order)
SELECT 'Premium', 'Unlimited access', 9.99, 99.99, '["Unlimited articles","Ad-free experience","Premium content access","Early access to news"]'::jsonb, true, true, 2
WHERE NOT EXISTS (SELECT 1 FROM subscription_tiers WHERE name = 'Premium');

INSERT INTO subscription_tiers (name, description, price_monthly, price_yearly, features, ad_free, early_access, display_order)
SELECT 'VIP', 'Exclusive access', 19.99, 199.99, '["Everything in Premium","Exclusive interviews","Behind-the-scenes content","VIP events access","Priority support"]'::jsonb, true, true, 3
WHERE NOT EXISTS (SELECT 1 FROM subscription_tiers WHERE name = 'VIP');

-- 9. LIVE_EVENTS TABLE
CREATE TABLE IF NOT EXISTS live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  event_type text DEFAULT 'virtual',
  cover_image_url text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  venue_or_link text,
  ticket_price numeric DEFAULT 0,
  max_attendees integer,
  current_attendees integer DEFAULT 0,
  host_name text,
  host_avatar_url text,
  is_featured boolean DEFAULT false,
  status text DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_live_events_status_start ON live_events(status, start_time);
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "live_events_public_read" ON live_events;
CREATE POLICY "live_events_public_read" ON live_events
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "live_events_admin_insert" ON live_events;
CREATE POLICY "live_events_admin_insert" ON live_events
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "live_events_admin_update" ON live_events;
CREATE POLICY "live_events_admin_update" ON live_events
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "live_events_admin_delete" ON live_events;
CREATE POLICY "live_events_admin_delete" ON live_events
  FOR DELETE TO authenticated USING (is_admin());

-- 10. SPONSORED_CONTENT TABLE
CREATE TABLE IF NOT EXISTS sponsored_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  sponsor_name text NOT NULL,
  sponsor_logo_url text,
  sponsorship_fee numeric DEFAULT 0,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz DEFAULT now() + interval '90 days',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sponsored_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsored_content_public_read" ON sponsored_content;
CREATE POLICY "sponsored_content_public_read" ON sponsored_content
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "sponsored_content_admin_insert" ON sponsored_content;
CREATE POLICY "sponsored_content_admin_insert" ON sponsored_content
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "sponsored_content_admin_update" ON sponsored_content;
CREATE POLICY "sponsored_content_admin_update" ON sponsored_content
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "sponsored_content_admin_delete" ON sponsored_content;
CREATE POLICY "sponsored_content_admin_delete" ON sponsored_content
  FOR DELETE TO authenticated USING (is_admin());

-- 11. AFFILIATE_LINKS TABLE
CREATE TABLE IF NOT EXISTS affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  affiliate_url text NOT NULL,
  image_url text,
  description text,
  price text,
  rating numeric,
  commission_rate numeric DEFAULT 0,
  click_count integer DEFAULT 0,
  conversion_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "affiliate_links_public_read" ON affiliate_links;
CREATE POLICY "affiliate_links_public_read" ON affiliate_links
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "affiliate_links_admin_insert" ON affiliate_links;
CREATE POLICY "affiliate_links_admin_insert" ON affiliate_links
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "affiliate_links_admin_update" ON affiliate_links;
CREATE POLICY "affiliate_links_admin_update" ON affiliate_links
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "affiliate_links_admin_delete" ON affiliate_links;
CREATE POLICY "affiliate_links_admin_delete" ON affiliate_links
  FOR DELETE TO authenticated USING (is_admin());

-- 12. CONTENT_LICENSES TABLE
CREATE TABLE IF NOT EXISTS content_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  license_type text DEFAULT 'standard',
  pricing_model text DEFAULT 'flat_fee',
  flat_fee numeric,
  cpm_rate numeric,
  revenue_share_pct numeric,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_licenses_public_read" ON content_licenses;
CREATE POLICY "content_licenses_public_read" ON content_licenses
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "content_licenses_admin_insert" ON content_licenses;
CREATE POLICY "content_licenses_admin_insert" ON content_licenses
  FOR INSERT TO authenticated WITH CHECK (is_admin());
DROP POLICY IF EXISTS "content_licenses_admin_update" ON content_licenses;
CREATE POLICY "content_licenses_admin_update" ON content_licenses
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
DROP POLICY IF EXISTS "content_licenses_admin_delete" ON content_licenses;
CREATE POLICY "content_licenses_admin_delete" ON content_licenses
  FOR DELETE TO authenticated USING (is_admin());

-- 13. USER_SUBSCRIPTIONS TABLE (for Stripe webhook)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier_id uuid REFERENCES subscription_tiers(id) ON DELETE SET NULL,
  stripe_subscription_id text,
  stripe_customer_id text,
  status text DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe ON user_subscriptions(stripe_subscription_id);
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_subscriptions_own_read" ON user_subscriptions;
CREATE POLICY "user_subscriptions_own_read" ON user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_subscriptions_own_insert" ON user_subscriptions;
CREATE POLICY "user_subscriptions_own_insert" ON user_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "user_subscriptions_own_update" ON user_subscriptions;
CREATE POLICY "user_subscriptions_own_update" ON user_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add stripe columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_tier_id uuid;

-- 14. UPDATE_TRENDING_FEATURED_FLAGS FUNCTION
CREATE OR REPLACE FUNCTION update_trending_featured_flags()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media_content
  SET is_trending = true
  WHERE id IN (
    SELECT id FROM media_content
    WHERE published_at >= now() - interval '7 days'
    ORDER BY views_count DESC
    LIMIT 20
  );

  UPDATE media_content
  SET is_trending = false
  WHERE is_trending = true
    AND id NOT IN (
      SELECT id FROM media_content
      WHERE published_at >= now() - interval '7 days'
      ORDER BY views_count DESC
      LIMIT 20
    );

  UPDATE media_content
  SET is_featured = true, last_featured_at = COALESCE(last_featured_at, now())
  WHERE id IN (
    SELECT mc.id FROM media_content mc
    JOIN editorial_features ef ON ef.content_id = mc.id
    WHERE ef.is_active = true AND ef.end_date >= now()
  );

  UPDATE media_content
  SET is_featured = false
  WHERE is_featured = true
    AND id NOT IN (
      SELECT content_id FROM editorial_features
      WHERE is_active = true AND end_date >= now()
    )
    AND (last_featured_at IS NULL OR last_featured_at < now() - interval '30 days');
END;
$$;

-- 15. COMMENTS_COUNT TRIGGER
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE media_content
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE content_id = NEW.content_id)
    WHERE id = NEW.content_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE media_content
    SET comments_count = (SELECT COUNT(*) FROM comments WHERE content_id = OLD.content_id)
    WHERE id = OLD.content_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_comments_count_insert ON comments;
CREATE TRIGGER trigger_comments_count_insert
  AFTER INSERT ON comments FOR EACH ROW EXECUTE FUNCTION update_comments_count();

DROP TRIGGER IF EXISTS trigger_comments_count_delete ON comments;
CREATE TRIGGER trigger_comments_count_delete
  AFTER DELETE ON comments FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- 16. Fix profiles RLS - allow anon to read profiles (for comment author display)
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT TO anon, authenticated USING (true);

-- 17. Fix comments INSERT policy
DROP POLICY IF EXISTS "comments_authenticated_insert" ON comments;
CREATE POLICY "comments_authenticated_insert" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Add update policy for own comments
DROP POLICY IF EXISTS "comments_own_update" ON comments;
CREATE POLICY "comments_own_update" ON comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. Fix media_content INSERT policy
DROP POLICY IF EXISTS "admin_insert_media_content" ON media_content;
CREATE POLICY "admin_insert_media_content" ON media_content
  FOR INSERT TO authenticated WITH CHECK (is_admin());
