/*
  # Intelligent Trending and Featured News System

  ## Overview
  Creates a smart system to identify truly trending and featured news based on real engagement metrics
  and recency, not arbitrary flags. This ensures only breaking, high-engagement stories are featured.

  ## Changes

  1. **New Functions**
     - `calculate_trending_score()` - Calculates a trending score based on:
       - Article recency (last 48 hours get highest weight)
       - View velocity (views per hour since publication)
       - Engagement (comments count)
       - Breaking news keywords (war, crisis, breaking, etc.)
     
     - `update_trending_featured_flags()` - Automatically updates is_trending and is_featured
       based on calculated scores

  2. **Automated Updates**
     - Function can be called to update trending/featured flags
     - Only articles less than 7 days old can be trending
     - Only articles less than 48 hours old can be featured
     - Top 6 by score marked as trending
     - Top 3 by score marked as featured

  3. **Breaking News Detection**
     - Keywords: venezuela, ukraine, russia, war, crisis, breaking, urgent, abduction, attack
     - Major events automatically get trending boost

  ## Notes
  - Trending flags are dynamic and update based on real engagement
  - Old articles cannot be marked as trending
  - Featured articles must be very recent and highly engaging
*/

-- Function to calculate trending score for an article
CREATE OR REPLACE FUNCTION calculate_trending_score(
  p_published_at timestamptz,
  p_views_count integer,
  p_comments_count integer,
  p_title text,
  p_content text
) RETURNS numeric AS $$
DECLARE
  v_score numeric := 0;
  v_hours_old numeric;
  v_views_per_hour numeric;
  v_recency_weight numeric;
  v_keyword_boost numeric := 0;
BEGIN
  -- Calculate hours since publication
  v_hours_old := EXTRACT(EPOCH FROM (now() - p_published_at)) / 3600;
  
  -- Don't score articles older than 7 days
  IF v_hours_old > 168 THEN
    RETURN 0;
  END IF;
  
  -- Calculate views per hour (velocity)
  IF v_hours_old > 0 THEN
    v_views_per_hour := p_views_count::numeric / v_hours_old;
  ELSE
    v_views_per_hour := p_views_count::numeric;
  END IF;
  
  -- Recency weight (newer = higher weight)
  -- Last 24 hours: 5x multiplier
  -- 24-48 hours: 3x multiplier
  -- 48-72 hours: 2x multiplier
  -- 72+ hours: 1x multiplier
  IF v_hours_old <= 24 THEN
    v_recency_weight := 5.0;
  ELSIF v_hours_old <= 48 THEN
    v_recency_weight := 3.0;
  ELSIF v_hours_old <= 72 THEN
    v_recency_weight := 2.0;
  ELSE
    v_recency_weight := 1.0;
  END IF;
  
  -- Check for breaking news keywords
  IF p_title ~* '(venezuela|ukraine|russia|war|crisis|breaking|urgent|abduction|kidnap|attack|invasion|strike|protest|election|coup|disaster|emergency)' OR
     p_content ~* '(venezuela|ukraine|russia|war|crisis|breaking|urgent|abduction|kidnap|attack|invasion|strike|protest|election|coup|disaster|emergency)' THEN
    v_keyword_boost := 50;
  END IF;
  
  -- Calculate final score
  -- Formula: (views_per_hour * 10) + (comments * 5) + keyword_boost, all multiplied by recency
  v_score := ((v_views_per_hour * 10) + (p_comments_count * 5) + v_keyword_boost) * v_recency_weight;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update trending and featured flags
CREATE OR REPLACE FUNCTION update_trending_featured_flags() RETURNS void AS $$
BEGIN
  -- First, clear all existing flags
  UPDATE media_content 
  SET is_trending = false, is_featured = false;
  
  -- Mark top 6 articles as trending (must be within 7 days)
  WITH trending_articles AS (
    SELECT id, calculate_trending_score(
      published_at,
      views_count,
      comments_count,
      title,
      content
    ) as score
    FROM media_content
    WHERE published_at > now() - interval '7 days'
    ORDER BY score DESC
    LIMIT 6
  )
  UPDATE media_content
  SET is_trending = true
  FROM trending_articles
  WHERE media_content.id = trending_articles.id
    AND trending_articles.score > 10;
  
  -- Mark top 3 articles as featured (must be within 48 hours and highly engaging)
  WITH featured_articles AS (
    SELECT id, calculate_trending_score(
      published_at,
      views_count,
      comments_count,
      title,
      content
    ) as score
    FROM media_content
    WHERE published_at > now() - interval '48 hours'
    ORDER BY score DESC
    LIMIT 3
  )
  UPDATE media_content
  SET is_featured = true
  FROM featured_articles
  WHERE media_content.id = featured_articles.id
    AND featured_articles.score > 50;
END;
$$ LANGUAGE plpgsql;

-- Run the update function immediately
SELECT update_trending_featured_flags();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_content_published_views 
ON media_content (published_at DESC, views_count DESC);

CREATE INDEX IF NOT EXISTS idx_media_content_engagement 
ON media_content (comments_count DESC, views_count DESC);
