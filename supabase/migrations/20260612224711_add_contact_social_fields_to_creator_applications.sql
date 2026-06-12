-- Add contact and social media fields to creator_applications
ALTER TABLE creator_applications
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS tiktok_handle text,
  ADD COLUMN IF NOT EXISTS twitter_handle text,
  ADD COLUMN IF NOT EXISTS youtube_channel text,
  ADD COLUMN IF NOT EXISTS facebook_url text;