
-- Create archive table to store old articles for future reference
CREATE TABLE IF NOT EXISTS media_content_archive (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  slug text NOT NULL,
  description text,
  content text,
  category_id uuid,
  author_id uuid,
  media_type text,
  media_url text,
  thumbnail_url text,
  duration integer,
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  views_count integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  source_id uuid,
  external_url text,
  source_published_at timestamptz,
  is_premium boolean DEFAULT false,
  min_tier_required text,
  editorial_notes text,
  last_featured_at timestamptz,
  comments_count integer DEFAULT 0,
  archived_at timestamptz DEFAULT NOW()
);

-- Index for searching archived articles
CREATE INDEX idx_archive_published_at ON media_content_archive (published_at DESC);
CREATE INDEX idx_archive_title ON media_content_archive USING gin (to_tsvector('english', title));
CREATE INDEX idx_archive_category ON media_content_archive (category_id);
CREATE INDEX idx_archive_slug ON media_content_archive (slug);

-- Enable RLS
ALTER TABLE media_content_archive ENABLE ROW LEVEL SECURITY;

-- Public read access for archived content
CREATE POLICY "public_read_archive" ON media_content_archive
  FOR SELECT TO anon, authenticated USING (true);

-- Only service role can insert/update/delete archives
CREATE POLICY "service_manage_archive" ON media_content_archive
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Replace the delete trigger with an archive trigger
DROP TRIGGER IF EXISTS trigger_cleanup_stale_articles ON media_content;

CREATE OR REPLACE FUNCTION archive_stale_articles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Move articles older than 7 days to archive
  INSERT INTO media_content_archive (
    id, title, slug, description, content, category_id, author_id,
    media_type, media_url, thumbnail_url, duration, is_featured,
    is_trending, views_count, published_at, created_at, updated_at,
    source_id, external_url, source_published_at, is_premium,
    min_tier_required, editorial_notes, last_featured_at, comments_count
  )
  SELECT
    id, title, slug, description, content, category_id, author_id,
    media_type, media_url, thumbnail_url, duration, is_featured,
    is_trending, views_count, published_at, created_at, updated_at,
    source_id, external_url, source_published_at, is_premium,
    min_tier_required, editorial_notes, last_featured_at, comments_count
  FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days'
  ON CONFLICT (id) DO NOTHING;

  -- Then remove from live table
  DELETE FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days';

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_archive_stale_articles
  AFTER INSERT ON media_content
  FOR EACH STATEMENT
  EXECUTE FUNCTION archive_stale_articles();

-- Also update the standalone cleanup function to archive instead of delete
CREATE OR REPLACE FUNCTION cleanup_stale_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  archived_count integer;
BEGIN
  INSERT INTO media_content_archive (
    id, title, slug, description, content, category_id, author_id,
    media_type, media_url, thumbnail_url, duration, is_featured,
    is_trending, views_count, published_at, created_at, updated_at,
    source_id, external_url, source_published_at, is_premium,
    min_tier_required, editorial_notes, last_featured_at, comments_count
  )
  SELECT
    id, title, slug, description, content, category_id, author_id,
    media_type, media_url, thumbnail_url, duration, is_featured,
    is_trending, views_count, published_at, created_at, updated_at,
    source_id, external_url, source_published_at, is_premium,
    min_tier_required, editorial_notes, last_featured_at, comments_count
  FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days'
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;
