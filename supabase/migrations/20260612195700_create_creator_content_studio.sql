-- Creator Content Studio: Videos, Live Streams, Short Clips, Social Posts
CREATE TABLE IF NOT EXISTS creator_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_applications(id) ON DELETE CASCADE,
  content_type text NOT NULL CHECK (content_type IN ('video', 'livestream', 'clip', 'social_post')),
  title text NOT NULL,
  description text,
  thumbnail_url text,
  media_url text,
  external_url text,
  platform text CHECK (platform IN ('youtube', 'tiktok', 'instagram', 'twitter', 'facebook', 'twitch', 'custom', NULL)),
  category text NOT NULL DEFAULT 'entertainment',
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled', 'archived', 'live')),
  scheduled_at timestamptz,
  published_at timestamptz,
  duration_seconds integer,
  view_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_creator_content_creator_id ON creator_content(creator_id);
CREATE INDEX idx_creator_content_type ON creator_content(content_type);
CREATE INDEX idx_creator_content_status ON creator_content(status);
CREATE INDEX idx_creator_content_category ON creator_content(category);
CREATE INDEX idx_creator_content_published_at ON creator_content(published_at DESC);
CREATE INDEX idx_creator_content_featured ON creator_content(is_featured) WHERE is_featured = true;
CREATE INDEX idx_creator_content_composite ON creator_content(creator_id, content_type, status);

-- Enable RLS
ALTER TABLE creator_content ENABLE ROW LEVEL SECURITY;

-- Public can view published content
CREATE POLICY "public_view_published_content" ON creator_content
  FOR SELECT TO anon, authenticated
  USING (status = 'published' OR status = 'live');

-- Creators can view all their own content (any status)
CREATE POLICY "creators_select_own_content" ON creator_content
  FOR SELECT TO authenticated
  USING (creator_id IN (
    SELECT id FROM creator_applications WHERE user_id = auth.uid()
  ));

CREATE POLICY "creators_insert_own_content" ON creator_content
  FOR INSERT TO authenticated
  WITH CHECK (creator_id IN (
    SELECT id FROM creator_applications WHERE user_id = auth.uid() AND status IN ('approved', 'onboarded')
  ));

CREATE POLICY "creators_update_own_content" ON creator_content
  FOR UPDATE TO authenticated
  USING (creator_id IN (
    SELECT id FROM creator_applications WHERE user_id = auth.uid()
  ))
  WITH CHECK (creator_id IN (
    SELECT id FROM creator_applications WHERE user_id = auth.uid()
  ));

CREATE POLICY "creators_delete_own_content" ON creator_content
  FOR DELETE TO authenticated
  USING (creator_id IN (
    SELECT id FROM creator_applications WHERE user_id = auth.uid()
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_creator_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_creator_content_updated_at
  BEFORE UPDATE ON creator_content
  FOR EACH ROW
  EXECUTE FUNCTION update_creator_content_updated_at();

-- Content categories for the studio
CREATE TABLE IF NOT EXISTS content_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  color text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE content_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_view_content_categories" ON content_categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "admins_manage_content_categories" ON content_categories
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed default content categories
INSERT INTO content_categories (name, slug, icon, color, display_order) VALUES
  ('Entertainment', 'entertainment', 'tv', '#EF4444', 1),
  ('Music', 'music', 'music', '#8B5CF6', 2),
  ('Sports', 'sports', 'trophy', '#10B981', 3),
  ('Gaming', 'gaming', 'gamepad-2', '#F59E0B', 4),
  ('Education', 'education', 'graduation-cap', '#3B82F6', 5),
  ('News & Politics', 'news-politics', 'newspaper', '#6B7280', 6),
  ('Comedy', 'comedy', 'smile', '#EC4899', 7),
  ('Lifestyle', 'lifestyle', 'heart', '#14B8A6', 8),
  ('Technology', 'technology', 'cpu', '#6366F1', 9),
  ('Fashion & Beauty', 'fashion-beauty', 'sparkles', '#F472B6', 10),
  ('Food & Cooking', 'food-cooking', 'utensils', '#F97316', 11),
  ('Travel', 'travel', 'plane', '#0EA5E9', 12),
  ('Fitness & Health', 'fitness-health', 'dumbbell', '#22C55E', 13),
  ('Business & Finance', 'business-finance', 'briefcase', '#1D4ED8', 14)
ON CONFLICT (slug) DO NOTHING;