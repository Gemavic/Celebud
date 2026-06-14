
-- Add missing SEO columns to media_content
ALTER TABLE media_content
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_keywords text;

-- Create a SECURITY DEFINER function for reliable admin checks (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  )
$$;

-- Drop old policies and recreate using the function
DROP POLICY IF EXISTS "admin_update_media_content" ON media_content;
DROP POLICY IF EXISTS "admin_insert_media_content" ON media_content;
DROP POLICY IF EXISTS "admin_delete_media_content" ON media_content;

CREATE POLICY "admin_update_media_content" ON media_content
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_insert_media_content" ON media_content
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_media_content" ON media_content
  FOR DELETE TO authenticated
  USING (public.is_admin());
