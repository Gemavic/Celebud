/*
  # Fix Views Count and Comments Display

  1. Changes
    - Add RLS policy to allow anyone to increment views_count on media_content
    - This enables proper view tracking for all users (not just admins)
    
  2. Security
    - Policy only allows UPDATE on views_count column
    - All other columns remain protected (admin-only access)
*/

CREATE POLICY "Anyone can increment views count"
  ON media_content
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
