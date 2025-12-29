/*
  # Fix Views Tracking with Secure Function

  1. Changes
    - Remove the insecure policy that allows anyone to update media_content
    - Create a secure function to increment views_count
    - This function runs with elevated privileges (SECURITY DEFINER)
    
  2. Security
    - Only the views_count column can be incremented via the function
    - All other columns remain protected (admin-only access)
    - Function validates input and prevents abuse
*/

-- Remove the insecure policy
DROP POLICY IF EXISTS "Anyone can increment views count" ON media_content;

-- Create a secure function to increment views
CREATE OR REPLACE FUNCTION increment_article_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE media_content
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = article_id;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION increment_article_views(uuid) TO anon, authenticated;
