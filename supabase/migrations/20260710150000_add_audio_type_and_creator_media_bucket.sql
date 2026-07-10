-- Content Studio upgrade: direct device uploads + audio content type
--
-- 1. New public storage bucket `creator-media` so creators can upload
--    pre-recorded video/audio straight from their devices (the existing
--    `media` bucket is images-only, 5MB).
-- 2. Allow 'audio' as a creator_content content type (podcasts, voice
--    reports, music).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'creator-media',
  'creator-media',
  true,
  524288000, -- 500 MB per file (the project-wide upload limit in
             -- Dashboard -> Storage -> Settings may cap this lower)
  ARRAY['video/*', 'audio/*', 'image/*']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view creator media" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'creator-media');

CREATE POLICY "Authenticated can upload creator media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'creator-media');

CREATE POLICY "Authenticated can update own creator media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'creator-media' AND owner = auth.uid());

CREATE POLICY "Authenticated can delete own creator media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'creator-media' AND owner = auth.uid());

-- Add 'audio' to the allowed content types
ALTER TABLE creator_content DROP CONSTRAINT IF EXISTS creator_content_content_type_check;
ALTER TABLE creator_content ADD CONSTRAINT creator_content_content_type_check
  CHECK (content_type IN ('video', 'audio', 'livestream', 'clip', 'social_post'));

NOTIFY pgrst, 'reload schema';
