-- Add missing columns to categories table for CelebUD
ALTER TABLE categories ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Insert CelebUD categories (will not conflict if slugs already exist)
INSERT INTO categories (name, slug, icon, color, display_order) VALUES
  ('News', 'news', 'newspaper', '#DC2626', 1),
  ('Politics', 'politics', 'landmark', '#1D4ED8', 2),
  ('Society', 'society', 'users', '#7C3AED', 3),
  ('Entertainment', 'entertainment', 'film', '#EC4899', 4),
  ('Fin-Advisor', 'fin-advisor', 'dollar-sign', '#059669', 5),
  ('Business', 'business', 'briefcase', '#F59E0B', 6),
  ('Lifestyle', 'lifestyle', 'heart', '#F43F5E', 7),
  ('Video', 'video', 'video', '#EF4444', 8),
  ('Interview', 'interview', 'mic', '#10B981', 9),
  ('Celebrity', 'celebrity', 'star', '#8B5CF6', 10),
  ('Sports', 'sports', 'trophy', '#16A34A', 11),
  ('Health', 'health', 'activity', '#06B6D4', 12),
  ('Security', 'security', 'shield', '#4B5563', 13),
  ('Legal', 'legal', 'scale', '#78350F', 14)
ON CONFLICT (slug) DO UPDATE SET
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  icon = EXCLUDED.icon;

-- Create authors table
CREATE TABLE IF NOT EXISTS authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  avatar_url text,
  bio text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authors_public_read" ON authors FOR SELECT TO anon, authenticated USING (true);

-- Create media_content table
CREATE TABLE IF NOT EXISTS media_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL,
  description text DEFAULT '',
  content text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  author_id uuid REFERENCES authors(id) ON DELETE SET NULL,
  media_type text DEFAULT 'article',
  media_url text,
  external_url text,
  thumbnail_url text,
  duration integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_trending boolean DEFAULT false,
  views_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE media_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_content_public_read" ON media_content FOR SELECT TO anon, authenticated USING (true);

-- Indexes for media_content
CREATE INDEX IF NOT EXISTS idx_media_content_category ON media_content(category_id);
CREATE INDEX IF NOT EXISTS idx_media_content_author ON media_content(author_id);
CREATE INDEX IF NOT EXISTS idx_media_content_featured ON media_content(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_media_content_trending ON media_content(is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_media_content_published ON media_content(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_content_views ON media_content(views_count DESC);

-- Create the views increment function (SECURITY DEFINER so anon users can increment)
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
END;
$$;

GRANT EXECUTE ON FUNCTION increment_article_views(uuid) TO anon, authenticated;

-- Insert default author
INSERT INTO authors (name, avatar_url, bio) VALUES
  ('Matthew Ayandare', 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200', 'Editor-in-Chief at CelebUD, covering entertainment, celebrity news, and cultural trends.')
ON CONFLICT DO NOTHING;

-- Create newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  subscribed_at timestamptz DEFAULT now()
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "newsletter_public_insert" ON newsletter_subscribers FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Create profiles table for auth users
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_public_read" ON profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "profiles_own_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_public_read" ON comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_authenticated_insert" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_own_delete" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_comments_content ON comments(content_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- Create editorial_features table
CREATE TABLE IF NOT EXISTS editorial_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES media_content(id) ON DELETE CASCADE,
  feature_type text DEFAULT 'spotlight',
  priority integer DEFAULT 0,
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE editorial_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "editorial_public_read" ON editorial_features FOR SELECT TO anon, authenticated USING (true);

-- Create news_sources table
CREATE TABLE IF NOT EXISTS news_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  feed_url text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  country text DEFAULT 'CA',
  priority integer DEFAULT 5,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_sources_public_read" ON news_sources FOR SELECT TO anon, authenticated USING (true);
