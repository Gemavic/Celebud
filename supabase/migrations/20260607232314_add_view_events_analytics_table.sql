-- Create view_events table for time-series analytics
CREATE TABLE IF NOT EXISTS view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  referrer text,
  user_agent text,
  country text
);

ALTER TABLE view_events ENABLE ROW LEVEL SECURITY;

-- Public can insert (via the function), authenticated can read
CREATE POLICY "view_events_public_read" ON view_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "view_events_service_insert" ON view_events FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Index for fast analytics queries
CREATE INDEX idx_view_events_article ON view_events(article_id);
CREATE INDEX idx_view_events_time ON view_events(viewed_at DESC);
CREATE INDEX idx_view_events_article_time ON view_events(article_id, viewed_at DESC);

-- Update the increment function to also log to view_events
CREATE OR REPLACE FUNCTION increment_article_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE media_content
  SET views_count = COALESCE(views_count, 0) + 1,
      updated_at = now()
  WHERE id = article_id;

  INSERT INTO view_events (article_id) VALUES (article_id);
END;
$$;

GRANT EXECUTE ON FUNCTION increment_article_views(uuid) TO anon, authenticated;
