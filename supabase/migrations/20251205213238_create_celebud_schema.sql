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
  ('Sarah Johnson', 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200', 'Entertainment journalist with 10 years of experience covering Hollywood.'),
  ('Michael Chen', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200', 'Business reporter specializing in tech startups and venture capital.'),
  ('Emma Rodriguez', 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200', 'Celebrity interviewer known for in-depth conversations with A-list stars.'),
  ('David Kim', 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=200', 'Audio producer and podcast host covering pop culture trends.')
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

-- Insert sample media content
INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, is_featured, is_trending, views_count
) 
SELECT 
  'Behind the Scenes: Making of the Year''s Biggest Blockbuster',
  'behind-scenes-biggest-blockbuster',
  'Exclusive access to the set of this summer''s most anticipated film. Directors, actors, and crew share their experiences.',
  'In this exclusive behind-the-scenes look, we take you inside the making of the year''s most anticipated blockbuster...',
  (SELECT id FROM categories WHERE slug = 'video' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'Sarah Johnson' LIMIT 1),
  'video',
  'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  true,
  125400
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'behind-scenes-biggest-blockbuster');

INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, is_trending, views_count
)
SELECT
  'Tech Billionaire Reveals Secrets to Success in Candid Interview',
  'tech-billionaire-success-secrets',
  'Sit down with one of Silicon Valley''s most influential figures as they share their journey from startup to empire.',
  'In this revealing interview, we explore the mindset, strategies, and pivotal moments...',
  (SELECT id FROM categories WHERE slug = 'interview' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'Emma Rodriguez' LIMIT 1),
  'interview',
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  98500
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'tech-billionaire-success-secrets');

INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, is_featured, views_count
)
SELECT
  'Chart-Topping Artist Drops Surprise Album: Our First Listen',
  'surprise-album-first-listen',
  'The music world is buzzing after an unexpected album release. We break down every track in this exclusive audio review.',
  'Just hours ago, one of the biggest names in music dropped a surprise album...',
  (SELECT id FROM categories WHERE slug = 'audio' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'David Kim' LIMIT 1),
  'audio',
  'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  87300
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'surprise-album-first-listen');

INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, is_trending, views_count
)
SELECT
  'Celebrity Power Couple Announces New Business Venture',
  'celebrity-couple-business-venture',
  'Hollywood''s favorite duo is expanding their empire with an innovative new company that''s already attracting major investors.',
  'In a move that surprised many industry watchers, the power couple announced...',
  (SELECT id FROM categories WHERE slug = 'celebrity' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'Michael Chen' LIMIT 1),
  'article',
  'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800',
  true,
  145200
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'celebrity-couple-business-venture');

INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, views_count
)
SELECT
  'Streaming Wars: How New Players Are Reshaping Entertainment',
  'streaming-wars-reshaping-entertainment',
  'Analysis of the rapidly evolving streaming landscape and what it means for content creators and consumers.',
  'The entertainment industry is undergoing its biggest transformation in decades...',
  (SELECT id FROM categories WHERE slug = 'business' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'Michael Chen' LIMIT 1),
  'article',
  'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=800',
  65800
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'streaming-wars-reshaping-entertainment');

INSERT INTO media_content (
  title, slug, description, content, category_id, author_id, 
  media_type, thumbnail_url, views_count
)
SELECT
  'Red Carpet Rewind: Fashion Highlights from Last Night''s Awards',
  'red-carpet-fashion-highlights',
  'The best dressed celebrities and the designers behind their stunning looks at the industry''s biggest night.',
  'Last night''s award ceremony was a masterclass in fashion...',
  (SELECT id FROM categories WHERE slug = 'entertainment' LIMIT 1),
  (SELECT id FROM authors WHERE name = 'Sarah Johnson' LIMIT 1),
  'article',
  'https://images.pexels.com/photos/1139613/pexels-photo-1139613.jpeg?auto=compress&cs=tinysrgb&w=800',
  52300
WHERE NOT EXISTS (SELECT 1 FROM media_content WHERE slug = 'red-carpet-fashion-highlights');