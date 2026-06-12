-- Creator Management System for tracking content creators and revenue sharing

CREATE TABLE IF NOT EXISTS creator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text,
  bio text,
  portfolio_url text,
  sample_topics text[],
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'onboarded')),
  revenue_share_pct numeric(5,2) NOT NULL DEFAULT 50.00,
  total_earnings numeric(10,2) NOT NULL DEFAULT 0,
  total_views bigint NOT NULL DEFAULT 0,
  articles_count integer NOT NULL DEFAULT 0,
  last_article_at timestamptz,
  admin_notes text,
  onboarded_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creator_applications(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid')),
  payment_method text DEFAULT 'bank_transfer',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

-- Enable RLS
ALTER TABLE creator_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_payouts ENABLE ROW LEVEL SECURITY;

-- Creators can view/manage their own applications
CREATE POLICY "select_own_creator_app" ON creator_applications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_creator_app" ON creator_applications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_creator_app" ON creator_applications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_creator_app" ON creator_applications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Admins can view ALL creator applications
CREATE POLICY "admin_select_all_creator_apps" ON creator_applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can update any creator application (approve/reject/onboard)
CREATE POLICY "admin_update_creator_apps" ON creator_applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Creator payouts: creators can view their own
CREATE POLICY "select_own_payouts" ON creator_payouts FOR SELECT
  TO authenticated USING (
    creator_id IN (SELECT id FROM creator_applications WHERE user_id = auth.uid())
  );

-- Admins can view all payouts
CREATE POLICY "admin_select_all_payouts" ON creator_payouts FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can insert payouts
CREATE POLICY "admin_insert_payouts" ON creator_payouts FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can update payouts
CREATE POLICY "admin_update_payouts" ON creator_payouts FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Admins can delete payouts
CREATE POLICY "admin_delete_payouts" ON creator_payouts FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_creator_applications_user ON creator_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_applications_status ON creator_applications(status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_creator ON creator_payouts(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_status ON creator_payouts(status);
CREATE INDEX IF NOT EXISTS idx_creator_payouts_period ON creator_payouts(period_start, period_end);
