
-- Drop the unique constraint that uses a btree index with size issues
ALTER TABLE media_content DROP CONSTRAINT IF EXISTS media_content_slug_key;

-- Recreate as a functional unique index on a truncated slug to avoid btree row size limit
CREATE UNIQUE INDEX media_content_slug_key ON media_content (left(slug, 200));
