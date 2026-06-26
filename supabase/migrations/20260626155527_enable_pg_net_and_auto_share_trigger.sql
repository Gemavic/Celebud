-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to auto-share new featured/manual articles to social channels
CREATE OR REPLACE FUNCTION notify_share_to_socials()
RETURNS trigger AS $$
BEGIN
  -- Only share featured or manually created articles
  IF NEW.is_featured = true OR NEW.is_manual = true THEN
    PERFORM net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1) || '/functions/v1/share-to-socials',
      body := json_build_object('article_id', NEW.id)::jsonb,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on media_content for new published articles
DROP TRIGGER IF EXISTS trg_share_new_article ON media_content;
CREATE TRIGGER trg_share_new_article
  AFTER INSERT ON media_content
  FOR EACH ROW
  WHEN (NEW.is_featured = true OR NEW.is_manual = true)
  EXECUTE FUNCTION notify_share_to_socials();
