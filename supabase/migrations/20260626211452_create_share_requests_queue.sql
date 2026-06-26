-- Share requests queue: browser inserts a row, server-side trigger calls the edge function
-- This avoids all CORS issues since pg_net runs server-to-server

CREATE TABLE IF NOT EXISTS share_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id  uuid NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
  requested_by uuid REFERENCES auth.users(id),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  result      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE share_requests ENABLE ROW LEVEL SECURITY;

-- Admins can insert and read
CREATE POLICY "admin_insert_share_requests" ON share_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_select_share_requests" ON share_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "admin_update_share_requests" ON share_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Trigger: on INSERT, immediately fire pg_net to call share-to-socials
CREATE OR REPLACE FUNCTION trigger_share_request()
RETURNS trigger AS $$
DECLARE
  v_url text := 'https://ucsuyrhlhmqezubfoszx.supabase.co/functions/v1/share-to-socials';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc3V5cmhsaG1xZXp1YmZvc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDE4NDgsImV4cCI6MjA4NjE3Nzg0OH0.h8-RhRoy0O9GGExPmDgh4q0QrZQLZBwtqxxaMYm-WiQ';
BEGIN
  PERFORM net.http_post(
    url     := v_url,
    body    := json_build_object('article_id', NEW.article_id)::jsonb,
    headers := json_build_object(
      'Content-Type', 'application/json',
      'apikey', v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_share_request
  AFTER INSERT ON share_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_share_request();

-- Index for status queries
CREATE INDEX idx_share_requests_article ON share_requests(article_id);
CREATE INDEX idx_share_requests_status ON share_requests(status);
