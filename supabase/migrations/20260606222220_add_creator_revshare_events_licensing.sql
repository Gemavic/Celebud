-- Creator Rev Share System (50/50 ad split with guest writers)
CREATE TABLE IF NOT EXISTS creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  bio text,
  portfolio_url text,
  sample_topics text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  revenue_share_pct numeric(5,2) NOT NULL DEFAULT 50.00,
  total_earnings numeric(10,2) NOT NULL DEFAULT 0,
  total_views bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creator_applications(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
  payment_method text DEFAULT 'bank_transfer',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- Live Events System ($5-$15 tickets)
CREATE TABLE IF NOT EXISTS live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'virtual' CHECK (event_type IN ('virtual', 'in_person', 'hybrid')),
  cover_image_url text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  venue_or_link text,
  ticket_price numeric(8,2) NOT NULL DEFAULT 9.99,
  max_attendees int,
  current_attendees int NOT NULL DEFAULT 0,
  host_name text,
  host_avatar_url text,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES live_events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_email text NOT NULL,
  buyer_name text,
  ticket_price numeric(8,2) NOT NULL,
  stripe_payment_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'refunded', 'cancelled')),
  purchased_at timestamptz NOT NULL DEFAULT now()
);

-- Content Licensing System (flat fee or CPM)
CREATE TABLE IF NOT EXISTS content_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  license_type text NOT NULL DEFAULT 'standard' CHECK (license_type IN ('standard', 'exclusive', 'syndication')),
  pricing_model text NOT NULL DEFAULT 'flat_fee' CHECK (pricing_model IN ('flat_fee', 'cpm', 'revenue_share')),
  flat_fee numeric(10,2),
  cpm_rate numeric(8,2),
  revenue_share_pct numeric(5,2),
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS license_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES content_licenses(id) ON DELETE CASCADE,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_company text,
  amount_paid numeric(10,2) NOT NULL,
  usage_rights text,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  stripe_payment_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  purchased_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_purchases ENABLE ROW LEVEL SECURITY;

-- Creator applications: users can view/manage their own
CREATE POLICY "select_own_creator_app" ON creator_applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_creator_app" ON creator_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_creator_app" ON creator_applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_creator_app" ON creator_applications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Creator payouts: creators can view their own
CREATE POLICY "select_own_payouts" ON creator_payouts FOR SELECT
  TO authenticated USING (creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid()));
CREATE POLICY "insert_payouts_service" ON creator_payouts FOR INSERT
  TO authenticated WITH CHECK (creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid()));
CREATE POLICY "update_payouts_service" ON creator_payouts FOR UPDATE
  TO authenticated USING (creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid()))
  WITH CHECK (creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid()));
CREATE POLICY "delete_payouts_service" ON creator_payouts FOR DELETE
  TO authenticated USING (creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid()));

-- Live events: public read, authenticated management
CREATE POLICY "select_events_public" ON live_events FOR SELECT
  TO anon, authenticated USING (true);
CREATE POLICY "insert_events_auth" ON live_events FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_events_auth" ON live_events FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_events_auth" ON live_events FOR DELETE
  TO authenticated USING (true);

-- Event tickets: users see their own
CREATE POLICY "select_own_tickets" ON event_tickets FOR SELECT
  TO authenticated USING (user_id = auth.uid());
CREATE POLICY "insert_tickets_auth" ON event_tickets FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "update_own_tickets" ON event_tickets FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete_own_tickets" ON event_tickets FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- Content licenses: public read
CREATE POLICY "select_licenses_public" ON content_licenses FOR SELECT
  TO anon, authenticated USING (is_available = true);
CREATE POLICY "insert_licenses_auth" ON content_licenses FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_licenses_auth" ON content_licenses FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_licenses_auth" ON content_licenses FOR DELETE
  TO authenticated USING (true);

-- License purchases: buyers see their own
CREATE POLICY "select_own_license_purchases" ON license_purchases FOR SELECT
  TO authenticated USING (buyer_email IN (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "insert_license_purchases_auth" ON license_purchases FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_license_purchases_auth" ON license_purchases FOR UPDATE
  TO authenticated USING (buyer_email IN (SELECT email FROM auth.users WHERE id = auth.uid()))
  WITH CHECK (buyer_email IN (SELECT email FROM auth.users WHERE id = auth.uid()));
CREATE POLICY "delete_license_purchases_auth" ON license_purchases FOR DELETE
  TO authenticated USING (buyer_email IN (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_applications_user ON creator_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON creator_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_events_start_time ON live_events(start_time);
CREATE INDEX IF NOT EXISTS idx_live_events_status ON live_events(status);
CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_user ON event_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_content_licenses_article ON content_licenses(article_id);
CREATE INDEX IF NOT EXISTS idx_license_purchases_license ON license_purchases(license_id);

-- Insert some sample events
INSERT INTO live_events (title, description, event_type, start_time, end_time, ticket_price, max_attendees, host_name, is_featured, status)
VALUES 
  ('Celebrity Interview Live: Summer Stars', 'Join us for an exclusive live interview with this summer''s hottest celebrities. Q&A session included.', 'virtual', now() + interval '7 days', now() + interval '7 days' + interval '2 hours', 9.99, 500, 'CelebUD Team', true, 'upcoming'),
  ('Entertainment Industry Networking Mixer', 'Connect with entertainment journalists, publicists, and content creators in this virtual networking event.', 'virtual', now() + interval '14 days', now() + interval '14 days' + interval '3 hours', 14.99, 200, 'CelebUD Team', false, 'upcoming'),
  ('Breaking News Deep Dive: Weekly Roundup', 'Our editors break down the biggest stories of the week with insider analysis and predictions.', 'virtual', now() + interval '3 days', now() + interval '3 days' + interval '1 hour', 4.99, 1000, 'Matthew Ayandare', true, 'upcoming');

-- Update subscription pricing to $6.99 freemium model
UPDATE subscription_tiers SET price_monthly = 6.99, price_yearly = 69.99 WHERE name = 'Premium';
UPDATE subscription_tiers SET price_monthly = 14.99, price_yearly = 149.99 WHERE name = 'VIP';