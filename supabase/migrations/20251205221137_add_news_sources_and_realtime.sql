/*
  # Add Real-Time News Sources and Automation

  1. New Tables
    - `news_sources`
      - `id` (uuid, primary key)
      - `name` (text) - Source name (e.g., "BBC News", "Entertainment Weekly")
      - `source_type` (text) - "rss", "api", "manual"
      - `feed_url` (text) - RSS feed URL or API endpoint
      - `api_key_name` (text) - Reference to API key if needed
      - `category_mapping` (jsonb) - Map source categories to our categories
      - `is_active` (boolean)
      - `last_fetched_at` (timestamptz)
      - `fetch_interval_minutes` (integer)
      - `created_at` (timestamptz)

    - `news_fetch_log`
      - `id` (uuid, primary key)
      - `source_id` (uuid, foreign key)
      - `fetch_started_at` (timestamptz)
      - `fetch_completed_at` (timestamptz)
      - `items_fetched` (integer)
      - `items_added` (integer)
      - `status` (text) - "success", "failed", "partial"
      - `error_message` (text)

  2. Updates to Existing Tables
    - Add `source_id` to media_content
    - Add `external_url` to media_content
    - Add `source_published_at` to media_content

  3. Additional Categories
    - Add Politics, Society, Lifestyle categories

  4. Security
    - Enable RLS on new tables
    - Add public read policies
*/

-- Create news_sources table
CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_type text DEFAULT 'rss',
  feed_url text,
  api_key_name text,
  category_mapping jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_fetched_at timestamptz,
  fetch_interval_minutes integer DEFAULT 30,
  created_at timestamptz DEFAULT now()
);

-- Create news_fetch_log table
CREATE TABLE IF NOT EXISTS news_fetch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid REFERENCES news_sources(id) ON DELETE CASCADE,
  fetch_started_at timestamptz DEFAULT now(),
  fetch_completed_at timestamptz,
  items_fetched integer DEFAULT 0,
  items_added integer DEFAULT 0,
  status text DEFAULT 'pending',
  error_message text
);

-- Add new columns to media_content if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE media_content ADD COLUMN source_id uuid REFERENCES news_sources(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'external_url'
  ) THEN
    ALTER TABLE media_content ADD COLUMN external_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'source_published_at'
  ) THEN
    ALTER TABLE media_content ADD COLUMN source_published_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_fetch_log ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "News sources are viewable by everyone"
  ON news_sources FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "News fetch log is viewable by everyone"
  ON news_fetch_log FOR SELECT
  TO anon
  USING (true);

-- Add new categories
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Politics', 'politics', 'landmark', '#DC2626'),
  ('Society', 'society', 'users', '#059669'),
  ('Lifestyle', 'lifestyle', 'heart', '#EC4899')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample news sources (RSS feeds for celebrity/entertainment news)
INSERT INTO news_sources (name, source_type, feed_url, fetch_interval_minutes, category_mapping) VALUES
  (
    'Entertainment Weekly',
    'rss',
    'https://ew.com/feed/',
    30,
    '{"default": "entertainment"}'::jsonb
  ),
  (
    'Hollywood Reporter',
    'rss',
    'https://www.hollywoodreporter.com/feed/',
    30,
    '{"default": "celebrity"}'::jsonb
  ),
  (
    'Variety Entertainment',
    'rss',
    'https://variety.com/feed/',
    30,
    '{"default": "entertainment"}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- Create index for faster source lookups
CREATE INDEX IF NOT EXISTS idx_media_content_source ON media_content(source_id);
CREATE INDEX IF NOT EXISTS idx_news_sources_active ON news_sources(is_active, last_fetched_at);
CREATE INDEX IF NOT EXISTS idx_news_fetch_log_source ON news_fetch_log(source_id, fetch_started_at DESC);
