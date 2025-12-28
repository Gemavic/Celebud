/*
  # Add Comments Count Column and Trigger

  1. Changes
    - Add comments_count column to media_content table
    - Create function to update comments_count automatically
    - Add trigger to update count when comments are inserted or deleted
    - Initialize comments_count for existing content

  2. Security
    - Function runs with SECURITY DEFINER to bypass RLS
*/

-- Add comments_count column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'comments_count'
  ) THEN
    ALTER TABLE media_content ADD COLUMN comments_count INTEGER DEFAULT 0 NOT NULL;
  END IF;
END $$;

-- Function to update comments count
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE media_content
    SET comments_count = COALESCE(comments_count, 0) + 1
    WHERE id = NEW.content_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE media_content
    SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0)
    WHERE id = OLD.content_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;

-- Create trigger for comments
CREATE TRIGGER trigger_update_comments_count
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_count();

-- Initialize comments_count for existing content
UPDATE media_content mc
SET comments_count = (
  SELECT COUNT(*)
  FROM comments c
  WHERE c.content_id = mc.id
);