/*
  # Performance Optimization: Add Critical Indexes

  ## Overview
  Adds missing indexes on frequently queried columns to dramatically improve page load speed.

  ## Performance Impact
  These indexes will improve:
  - Homepage featured content queries (is_featured filter)
  - Trending section queries (is_trending filter)
  - Category filtering (category_id joins)
  - Latest articles sorting (published_at ordering)
  - Text search queries (full-text search on title, description)

  ## Indexes Added
  
  ### Media Content Performance Indexes
    - `idx_media_content_is_featured` on media_content(is_featured) WHERE is_featured = true
    - `idx_media_content_is_trending` on media_content(is_trending) WHERE is_trending = true
    - `idx_media_content_category_id` on media_content(category_id)
    - `idx_media_content_published_at` on media_content(published_at DESC)
    - `idx_media_content_source_id` on media_content(source_id)
    
  ### Full-Text Search Index
    - `idx_media_content_search` - GIN index for fast text search on title and description

  ## Notes
    - Partial indexes on is_featured and is_trending save space since most content is false
    - Published_at index is DESC to match query sorting
    - GIN index enables fast full-text search using PostgreSQL's to_tsvector
*/

-- Partial index for featured content (only indexes rows where is_featured = true)
CREATE INDEX IF NOT EXISTS idx_media_content_is_featured 
  ON media_content(is_featured, views_count DESC) 
  WHERE is_featured = true;

-- Partial index for trending content (only indexes rows where is_trending = true)
CREATE INDEX IF NOT EXISTS idx_media_content_is_trending 
  ON media_content(is_trending, views_count DESC) 
  WHERE is_trending = true;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_media_content_category_id 
  ON media_content(category_id, published_at DESC);

-- Index for published date ordering (most common sort)
CREATE INDEX IF NOT EXISTS idx_media_content_published_at 
  ON media_content(published_at DESC);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_media_content_source_id 
  ON media_content(source_id, published_at DESC);

-- Full-text search index for title and description
CREATE INDEX IF NOT EXISTS idx_media_content_search 
  ON media_content USING gin(to_tsvector('english', title || ' ' || coalesce(description, '')));

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_media_content_status_date 
  ON media_content(is_featured, is_trending, published_at DESC);
