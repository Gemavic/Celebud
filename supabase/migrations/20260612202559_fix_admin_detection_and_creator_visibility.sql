-- Add is_admin flag to profiles table for frontend admin detection
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Sync: mark users in admin_users table as admins in profiles
UPDATE profiles SET is_admin = true
WHERE id IN (SELECT user_id FROM admin_users);

-- Create a trigger to keep profiles.is_admin in sync when admin_users changes
CREATE OR REPLACE FUNCTION sync_admin_status_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET is_admin = true WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sync_admin_status_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET is_admin = false WHERE id = OLD.user_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_admin_on_insert ON admin_users;
CREATE TRIGGER trigger_sync_admin_on_insert
  AFTER INSERT ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_status_on_insert();

DROP TRIGGER IF EXISTS trigger_sync_admin_on_delete ON admin_users;
CREATE TRIGGER trigger_sync_admin_on_delete
  AFTER DELETE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_admin_status_on_delete();

-- Also allow admins to select all creator_applications via service role
-- Add a fallback policy: if user is in admin_users OR profiles.is_admin = true
-- This ensures the admin can always see all applications
DROP POLICY IF EXISTS "admin_select_all_creator_apps" ON creator_applications;
CREATE POLICY "admin_select_all_creator_apps" ON creator_applications FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "admin_update_creator_apps" ON creator_applications;
CREATE POLICY "admin_update_creator_apps" ON creator_applications FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );