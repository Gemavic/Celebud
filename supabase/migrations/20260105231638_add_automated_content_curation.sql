/*
  # Automated Content Curation System

  1. New Functions
    - `auto_curate_featured_content()` - Automatically selects top-performing articles for featured section
    - `auto_curate_trending_content()` - Automatically selects trending articles based on recent views

  2. Logic
    - Featured: Top 3 articles by total views, published within last 30 days
    - Trending: Top 4 articles by views in last 7 days

  3. Scheduled Execution
    - Can be called manually or via cron job
    - Resets old featured/trending flags and sets new ones
*/

CREATE OR REPLACE FUNCTION auto_curate_featured_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media_content
  SET is_featured = false, last_featured_at = NULL
  WHERE is_featured = true;

  UPDATE media_content
  SET is_featured = true, last_featured_at = NOW()
  WHERE id IN (
    SELECT id
    FROM media_content
    WHERE published_at >= NOW() - INTERVAL '30 days'
      AND thumbnail_url IS NOT NULL
      AND description IS NOT NULL
    ORDER BY views_count DESC, published_at DESC
    LIMIT 3
  );
END;
$$;

CREATE OR REPLACE FUNCTION auto_curate_trending_content()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media_content
  SET is_trending = false
  WHERE is_trending = true;

  UPDATE media_content
  SET is_trending = true
  WHERE id IN (
    SELECT id
    FROM media_content
    WHERE published_at >= NOW() - INTERVAL '7 days'
      AND thumbnail_url IS NOT NULL
    ORDER BY views_count DESC, comments_count DESC, published_at DESC
    LIMIT 4
  );
END;
$$;

CREATE OR REPLACE FUNCTION run_auto_curation()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  featured_count INT;
  trending_count INT;
BEGIN
  PERFORM auto_curate_featured_content();
  PERFORM auto_curate_trending_content();

  SELECT COUNT(*) INTO featured_count FROM media_content WHERE is_featured = true;
  SELECT COUNT(*) INTO trending_count FROM media_content WHERE is_trending = true;

  RETURN json_build_object(
    'success', true,
    'featured_count', featured_count,
    'trending_count', trending_count,
    'updated_at', NOW()
  );
END;
$$;