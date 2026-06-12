-- Ad clicks tracking table
CREATE TABLE IF NOT EXISTS ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES media_content(id) ON DELETE SET NULL,
  ad_position text NOT NULL,
  ad_type text NOT NULL DEFAULT 'banner',
  clicked_at timestamptz NOT NULL DEFAULT now(),
  referrer text,
  user_agent text,
  page_url text
);

ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_clicks_public_read" ON ad_clicks FOR SELECT TO authenticated USING (true);
CREATE POLICY "ad_clicks_anyone_insert" ON ad_clicks FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE INDEX idx_ad_clicks_clicked_at ON ad_clicks(clicked_at DESC);
CREATE INDEX idx_ad_clicks_article_id ON ad_clicks(article_id);
CREATE INDEX idx_ad_clicks_ad_position ON ad_clicks(ad_position);

-- Enhance view_events: allow anon read for dashboard (admins check on client)
DROP POLICY IF EXISTS "view_events_public_read" ON view_events;
CREATE POLICY "view_events_anyone_read" ON view_events FOR SELECT TO anon, authenticated USING (true);

-- Enhanced increment function that captures metadata
CREATE OR REPLACE FUNCTION increment_article_views_with_meta(
  p_article_id uuid,
  p_referrer text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE media_content
  SET views_count = COALESCE(views_count, 0) + 1,
      updated_at = now()
  WHERE id = p_article_id;

  INSERT INTO view_events (article_id, referrer, user_agent)
  VALUES (p_article_id, p_referrer, p_user_agent);
END;
$$;

-- Function to get ad click stats
CREATE OR REPLACE FUNCTION get_ad_click_stats(days_back integer DEFAULT 30)
RETURNS TABLE(
  total_clicks bigint,
  clicks_today bigint,
  clicks_this_week bigint,
  top_position text,
  top_position_clicks bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_clicks,
    COUNT(*) FILTER (WHERE clicked_at >= CURRENT_DATE)::bigint AS clicks_today,
    COUNT(*) FILTER (WHERE clicked_at >= CURRENT_DATE - INTERVAL '7 days')::bigint AS clicks_this_week,
    COALESCE(
      (SELECT ad_position FROM ad_clicks GROUP BY ad_position ORDER BY COUNT(*) DESC LIMIT 1),
      'none'
    ) AS top_position,
    COALESCE(
      (SELECT COUNT(*)::bigint FROM ad_clicks GROUP BY ad_position ORDER BY COUNT(*) DESC LIMIT 1),
      0
    ) AS top_position_clicks
  FROM ad_clicks
  WHERE clicked_at >= CURRENT_DATE - make_interval(days => days_back);
END;
$$;

-- Function to get recent activity (views + comments combined)
CREATE OR REPLACE FUNCTION get_recent_activity(activity_limit integer DEFAULT 20)
RETURNS TABLE(
  activity_type text,
  article_id uuid,
  article_title text,
  occurred_at timestamptz,
  extra_info text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'view'::text AS activity_type,
      ve.article_id,
      mc.title AS article_title,
      ve.viewed_at AS occurred_at,
      COALESCE(ve.referrer, 'direct')::text AS extra_info
    FROM view_events ve
    JOIN media_content mc ON mc.id = ve.article_id
    ORDER BY ve.viewed_at DESC
    LIMIT activity_limit
  )
  UNION ALL
  (
    SELECT
      'comment'::text AS activity_type,
      c.article_id,
      mc.title AS article_title,
      c.created_at AS occurred_at,
      c.content::text AS extra_info
    FROM comments c
    JOIN media_content mc ON mc.id = c.article_id
    ORDER BY c.created_at DESC
    LIMIT activity_limit
  )
  ORDER BY occurred_at DESC
  LIMIT activity_limit;
END;
$$;

-- Function for hourly view distribution (shows peak hours)
CREATE OR REPLACE FUNCTION get_hourly_views(days_back integer DEFAULT 7)
RETURNS TABLE(hour_of_day integer, view_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM viewed_at)::integer AS hour_of_day,
    COUNT(*)::bigint AS view_count
  FROM view_events
  WHERE viewed_at >= CURRENT_DATE - make_interval(days => days_back)
  GROUP BY EXTRACT(HOUR FROM viewed_at)
  ORDER BY hour_of_day;
END;
$$;

-- Function for top referrers
CREATE OR REPLACE FUNCTION get_top_referrers(ref_limit integer DEFAULT 10)
RETURNS TABLE(referrer_source text, visit_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(referrer, ''), 'Direct')::text AS referrer_source,
    COUNT(*)::bigint AS visit_count
  FROM view_events
  WHERE viewed_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY referrer
  ORDER BY COUNT(*) DESC
  LIMIT ref_limit;
END;
$$;