/*
  # CelebUD Media Platform Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique) - e.g., "Video", "Audio", "Interview", "Celebrity", "Business"
      - `slug` (text, unique) - URL-friendly version
      - `icon` (text) - Icon identifier for UI
      - `color` (text) - Theme color for the category
      - `created_at` (timestamptz)
    
    - `authors`
      - `id` (uuid, primary key)
      - `name` (text)
      - `avatar_url` (text)
      - `bio` (text)
      - `created_at` (timestamptz)
    
    - `media_content`
      - `id` (uuid, primary key)
      - `title` (text)
      - `slug` (text, unique)
      - `description` (text)
      - `content` (text) - Full article/content body
      - `category_id` (uuid, foreign key)
      - `author_id` (uuid, foreign key)
      - `media_type` (text) - "video", "audio", "article", "interview"
      - `media_url` (text) - URL for video/audio content
      - `thumbnail_url` (text)
      - `duration` (integer) - Duration in seconds for video/audio
      - `is_featured` (boolean)
      - `is_trending` (boolean)
      - `views_count` (integer)
      - `published_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `tags`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `created_at` (timestamptz)
    
    - `content_tags`
      - `content_id` (uuid, foreign key)
      - `tag_id` (uuid, foreign key)
      - Primary key (content_id, tag_id)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Future: Add authenticated user policies for content management

  3. Indexes
    - Add indexes on frequently queried columns for performance
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT 'folder',
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now()
);

-- Create authors table
CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create media_content table
CREATE TABLE IF NOT EXISTS media_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  content text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES authors(id) ON DELETE SET NULL,
  media_type text DEFAULT 'article',
  media_url text,
  thumbnail_url text,
  duration integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  views_count integer DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create content_tags junction table
CREATE TABLE IF NOT EXISTS content_tags (
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (content_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_media_content_category ON media_content(category_id);
CREATE INDEX IF NOT EXISTS idx_media_content_author ON media_content(author_id);
CREATE INDEX IF NOT EXISTS idx_media_content_featured ON media_content(is_featured);
CREATE INDEX IF NOT EXISTS idx_media_content_trending ON media_content(is_trending);
CREATE INDEX IF NOT EXISTS idx_media_content_published ON media_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_tags_content ON content_tags(content_id);
CREATE INDEX IF NOT EXISTS idx_content_tags_tag ON content_tags(tag_id);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Categories are viewable by everyone"
  ON categories FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authors are viewable by everyone"
  ON authors FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Media content is viewable by everyone"
  ON media_content FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Tags are viewable by everyone"
  ON tags FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Content tags are viewable by everyone"
  ON content_tags FOR SELECT
  TO anon
  USING (true);

-- Insert initial categories
INSERT INTO categories (name, slug, icon, color) VALUES
  ('Video', 'video', 'video', '#EF4444'),
  ('Audio', 'audio', 'music', '#F59E0B'),
  ('Interview', 'interview', 'mic', '#10B981'),
  ('Celebrity', 'celebrity', 'star', '#8B5CF6'),
  ('Business', 'business', 'briefcase', '#3B82F6'),
  ('Entertainment', 'entertainment', 'film', '#EC4899')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample authors
INSERT INTO authors (name, avatar_url, bio) VALUES
  ('Matthew Ayandare', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200', 'Editor-in-Chief at CelebUD, covering entertainment, celebrity news, and cultural trends.')
ON CONFLICT DO NOTHING;

-- Insert sample tags
INSERT INTO tags (name, slug) VALUES
  ('Breaking News', 'breaking-news'),
  ('Exclusive', 'exclusive'),
  ('Trending', 'trending'),
  ('Hollywood', 'hollywood'),
  ('Tech', 'tech'),
  ('Music', 'music'),
  ('Fashion', 'fashion'),
  ('Sports', 'sports')
ON CONFLICT (slug) DO NOTHING;