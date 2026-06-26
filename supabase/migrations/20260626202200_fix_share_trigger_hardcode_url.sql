-- Fix the auto-share trigger: use hardcoded project URL and anon key
-- share-to-socials has verifyJWT=false so anon key is sufficient for routing
-- The function internally uses its own SUPABASE_SERVICE_ROLE_KEY env var

CREATE OR REPLACE FUNCTION notify_share_to_socials()
RETURNS trigger AS $$
DECLARE
  v_url text := 'https://ucsuyrhlhmqezubfoszx.supabase.co/functions/v1/share-to-socials';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc3V5cmhsaG1xZXp1YmZvc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDE4NDgsImV4cCI6MjA4NjE3Nzg0OH0.h8-RhRoy0O9GGExPmDgh4q0QrZQLZBwtqxxaMYm-WiQ';
BEGIN
  IF NEW.is_featured = true OR NEW.is_manual = true THEN
    PERFORM net.http_post(
      url     := v_url,
      body    := json_build_object('article_id', NEW.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'apikey', v_anon_key,
        'Authorization', 'Bearer ' || v_anon_key
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger to ensure it's bound to the updated function
DROP TRIGGER IF EXISTS trg_share_new_article ON media_content;
CREATE TRIGGER trg_share_new_article
  AFTER INSERT ON media_content
  FOR EACH ROW
  WHEN (NEW.is_featured = true OR NEW.is_manual = true)
  EXECUTE FUNCTION notify_share_to_socials();
