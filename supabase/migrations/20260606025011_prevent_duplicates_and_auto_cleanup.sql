
-- Add unique constraint on external_url to prevent duplicate articles from being inserted
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_content_external_url_unique
ON media_content (external_url) WHERE external_url IS NOT NULL;

-- Add unique constraint on title to prevent same-title duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_content_title_unique
ON media_content (title);

-- Create a scheduled cleanup function that auto-deletes old articles
-- This runs every time fetch-news is called AND can be invoked independently
CREATE OR REPLACE FUNCTION auto_cleanup_stale_articles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete articles older than 7 days on every insert
  DELETE FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days';
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_cleanup_stale_articles ON media_content;

-- Create trigger that cleans up stale articles on each new insert
CREATE TRIGGER trigger_cleanup_stale_articles
  AFTER INSERT ON media_content
  FOR EACH STATEMENT
  EXECUTE FUNCTION auto_cleanup_stale_articles();
