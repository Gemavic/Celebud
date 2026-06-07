
-- Create storage bucket for media uploads (thumbnails, author photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the media bucket
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media');

CREATE POLICY "Authenticated users can update own media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can delete own media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'media');

-- Add SEO fields to media_content
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS seo_title text;
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS seo_keywords text;
