/*
  # Fix Media Content Public Access

  1. Changes
    - Enable RLS on media_content parent table and all partitions
    - Add public read policies to allow anonymous access to all articles
    - Ensure categories and authors remain publicly readable
  
  2. Security
    - Public SELECT access for all users (authenticated and anonymous)
    - Content is meant to be publicly accessible news articles
*/

-- Enable RLS on parent table and partitions
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2025_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2026_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2026_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content_2026_03 ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Public read access to media content" ON media_content;
DROP POLICY IF EXISTS "Public read access to media content" ON media_content_2025_12;
DROP POLICY IF EXISTS "Public read access to media content" ON media_content_2026_01;
DROP POLICY IF EXISTS "Public read access to media content" ON media_content_2026_02;
DROP POLICY IF EXISTS "Public read access to media content" ON media_content_2026_03;

-- Create public read policies for parent table
CREATE POLICY "Public read access to media content"
  ON media_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Create public read policies for all partitions
CREATE POLICY "Public read access to media content"
  ON media_content_2025_12
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to media content"
  ON media_content_2026_01
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to media content"
  ON media_content_2026_02
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public read access to media content"
  ON media_content_2026_03
  FOR SELECT
  TO anon, authenticated
  USING (true);
