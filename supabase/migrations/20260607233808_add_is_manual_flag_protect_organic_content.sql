-- Add is_manual column to mark manually posted articles as permanent
-- Manual articles will NEVER be auto-archived or auto-deleted
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS is_manual boolean DEFAULT false;

-- Index for quickly filtering manual vs automated content
CREATE INDEX IF NOT EXISTS idx_media_content_is_manual ON media_content(is_manual) WHERE is_manual = true;

-- Ensure Fin-Advisor category has proper display_order for CelebUD
UPDATE categories 
SET display_order = 8 
WHERE slug = 'fin-advisor' AND (display_order IS NULL OR display_order = 0);

-- Update the auto-cleanup function to NEVER touch manual articles
CREATE OR REPLACE FUNCTION auto_archive_old_articles()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only archive RSS-fetched articles older than 7 days
  -- NEVER archive manually posted articles (is_manual = true)
  INSERT INTO media_content_archive 
  SELECT * FROM media_content 
  WHERE is_manual = false 
    AND source_id IS NOT NULL
    AND published_at < now() - interval '7 days'
    AND id NOT IN (SELECT id FROM media_content_archive);
  
  -- Only delete RSS-fetched articles older than 7 days
  DELETE FROM media_content 
  WHERE is_manual = false 
    AND source_id IS NOT NULL
    AND published_at < now() - interval '7 days';
END;
$$;

GRANT EXECUTE ON FUNCTION auto_archive_old_articles() TO authenticated;
