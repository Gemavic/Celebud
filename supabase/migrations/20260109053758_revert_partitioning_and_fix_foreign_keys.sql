/*
  # Revert Partitioning and Fix Foreign Keys

  1. Problem
    - Partitioning broke PostgREST foreign key relationships
    - Partitioned tables can't have unique constraints on non-partition keys
    - editorial_features and other tables can't properly join
  
  2. Solution
    - Drop the partitioned table structure
    - Rename media_content_old back to media_content
    - Fix all foreign key relationships
    - Keep all existing data intact
*/

-- Step 1: Drop views that depend on media_content
DROP MATERIALIZED VIEW IF EXISTS trending_articles_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS popular_content_cache CASCADE;

-- Step 2: Drop the partitioned table and its partitions
DROP TABLE IF EXISTS media_content CASCADE;

-- Step 3: Rename media_content_old back to media_content
ALTER TABLE IF EXISTS media_content_old RENAME TO media_content;

-- Step 4: Drop media_content_keys table (no longer needed)
DROP TABLE IF EXISTS media_content_keys CASCADE;

-- Step 5: Fix foreign keys in all dependent tables

-- Fix editorial_features
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'editorial_features') THEN
    ALTER TABLE editorial_features DROP CONSTRAINT IF EXISTS editorial_features_content_id_fkey;
    ALTER TABLE editorial_features DROP CONSTRAINT IF EXISTS editorial_features_content_id_fkey_new;
    ALTER TABLE editorial_features DROP CONSTRAINT IF EXISTS editorial_features_content_id_fkey_correct;
    ALTER TABLE editorial_features ADD CONSTRAINT editorial_features_content_id_fkey FOREIGN KEY (content_id) REFERENCES media_content(id);
  END IF;
END $$;

-- Fix comments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_content_id_fkey;
    ALTER TABLE comments ADD CONSTRAINT comments_content_id_fkey FOREIGN KEY (content_id) REFERENCES media_content(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix content_tags
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_tags') THEN
    ALTER TABLE content_tags DROP CONSTRAINT IF EXISTS content_tags_content_id_fkey;
    ALTER TABLE content_tags ADD CONSTRAINT content_tags_content_id_fkey FOREIGN KEY (content_id) REFERENCES media_content(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix sponsored_content
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sponsored_content') THEN
    ALTER TABLE sponsored_content DROP CONSTRAINT IF EXISTS sponsored_content_content_id_fkey;
    ALTER TABLE sponsored_content ADD CONSTRAINT sponsored_content_content_id_fkey FOREIGN KEY (content_id) REFERENCES media_content(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix affiliate_links
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'affiliate_links') THEN
    ALTER TABLE affiliate_links DROP CONSTRAINT IF EXISTS affiliate_links_content_id_fkey;
    ALTER TABLE affiliate_links ADD CONSTRAINT affiliate_links_content_id_fkey FOREIGN KEY (content_id) REFERENCES media_content(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Step 6: Ensure RLS is properly configured
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to media content" ON media_content;
DROP POLICY IF EXISTS "Media content is viewable by everyone" ON media_content;
DROP POLICY IF EXISTS "Admins can insert media content" ON media_content;
DROP POLICY IF EXISTS "Admins can update media content" ON media_content;

CREATE POLICY "Public read access to media content"
  ON media_content FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert media content"
  ON media_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update media content"
  ON media_content FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Step 7: Recreate simplified materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_articles_cache AS
SELECT 
  id,
  title,
  slug,
  description,
  thumbnail_url,
  published_at,
  views_count,
  is_trending,
  category_id,
  author_id
FROM media_content
WHERE is_trending = true
  AND published_at >= NOW() - INTERVAL '7 days'
ORDER BY views_count DESC, published_at DESC
LIMIT 100;

CREATE INDEX IF NOT EXISTS idx_trending_cache_views ON trending_articles_cache(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_trending_cache_published ON trending_articles_cache(published_at DESC);

-- Refresh the view
REFRESH MATERIALIZED VIEW trending_articles_cache;
