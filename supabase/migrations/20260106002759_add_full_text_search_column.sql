/*
  # Full-Text Search Column

  ## Overview
  Adds a generated tsvector column for fast full-text search on media_content.

  ## Changes
  1. Add generated column `fts` that combines title and description
  2. Create GIN index on the fts column for optimal search performance
  3. This enables fast text search without scanning entire tables

  ## Benefits
  - Dramatically faster search queries
  - Natural language search support
  - Better relevance ranking
  - Case-insensitive search by default
*/

-- Add full-text search column (generated from title and description)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media_content' AND column_name = 'fts'
  ) THEN
    ALTER TABLE media_content 
    ADD COLUMN fts tsvector 
    GENERATED ALWAYS AS (
      to_tsvector('english', title || ' ' || coalesce(description, ''))
    ) STORED;
  END IF;
END $$;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_media_content_fts 
  ON media_content USING gin(fts);
