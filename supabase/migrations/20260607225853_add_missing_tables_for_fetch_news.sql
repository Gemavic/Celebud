-- Add missing columns to media_content for the fetch-news function
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS source_id uuid REFERENCES news_sources(id) ON DELETE SET NULL;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS source_published_at timestamptz;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS min_tier_required text;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS editorial_notes text;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS last_featured_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_media_content_source ON media_content(source_id);
CREATE INDEX IF NOT EXISTS idx_media_content_external_url ON media_content(external_url);

-- Create media_content_archive table
CREATE TABLE IF NOT EXISTS media_content_archive (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  slug text,
  description text DEFAULT '',
  content text DEFAULT '',
  category_id uuid,
  author_id uuid,
  media_type text DEFAULT 'article',
  media_url text,
  thumbnail_url text,
  duration integer DEFAULT 0,
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
  archived_at timestamptz DEFAULT now()
);

ALTER TABLE media_content_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "archive_public_read" ON media_content_archive FOR SELECT TO anon, authenticated USING (true);

-- Create news_fetch_log table
CREATE TABLE IF NOT EXISTS news_fetch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES news_sources(id) ON DELETE SET NULL,
  fetch_started_at timestamptz,
  fetch_completed_at timestamptz,
  items_fetched integer DEFAULT 0,
  items_added integer DEFAULT 0,
  status text DEFAULT 'pending',
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news_fetch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fetch_log_public_read" ON news_fetch_log FOR SELECT TO anon, authenticated USING (true);

-- Add last_fetched_at to news_sources
ALTER TABLE news_sources ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz;
ALTER TABLE news_sources ADD COLUMN IF NOT EXISTS category_mapping jsonb DEFAULT '{"default": "news"}'::jsonb;

-- Add additional authors for the fetch-news function
INSERT INTO authors (name, avatar_url, bio) VALUES
  ('Gbenga Ayandare', 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200', 'Senior correspondent covering Nigerian politics, security, and African affairs.'),
  ('Victoria Odunola', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200', 'Entertainment and lifestyle editor with a focus on celebrity culture and trending stories.'),
  ('Chidinma Okafor', 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200', 'Business and finance reporter covering Canadian markets and global economics.'),
  ('Adebayo Ogundimu', 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=200', 'Sports correspondent covering football, basketball, and international athletics.')
ON CONFLICT DO NOTHING;

-- Insert some initial news sources
INSERT INTO news_sources (name, url, feed_url, category_id, is_active, country, priority) VALUES
  ('BBC News', 'https://www.bbc.com', 'https://feeds.bbci.co.uk/news/rss.xml', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'UK', 1),
  ('CBC News', 'https://www.cbc.ca', 'https://www.cbc.ca/webfeed/rss/rss-topstories', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'Canada', 1),
  ('Reuters', 'https://www.reuters.com', 'https://www.reutersagency.com/feed/', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'USA', 2),
  ('The Guardian', 'https://www.theguardian.com', 'https://www.theguardian.com/world/rss', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'UK', 2),
  ('CNN', 'https://www.cnn.com', 'http://rss.cnn.com/rss/edition.rss', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'USA', 2),
  ('Punch Nigeria', 'https://punchng.com', 'https://punchng.com/feed/', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'Nigeria', 1),
  ('Premium Times', 'https://www.premiumtimesng.com', 'https://www.premiumtimesng.com/feed', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'Nigeria', 2),
  ('CTV News', 'https://www.ctvnews.ca', 'https://www.ctvnews.ca/rss/TopStories', (SELECT id FROM categories WHERE slug = 'news' LIMIT 1), true, 'Canada', 2),
  ('ESPN', 'https://www.espn.com', 'https://www.espn.com/espn/rss/news', (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1), true, 'Sports', 1),
  ('Sky Sports', 'https://www.skysports.com', 'https://www.skysports.com/rss/12040', (SELECT id FROM categories WHERE slug = 'sports' LIMIT 1), true, 'Sports', 2)
ON CONFLICT DO NOTHING;
