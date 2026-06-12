-- Ensure admin_users table has proper RLS policies for the auth flow to work
-- Users need to be able to check if they are in admin_users

-- Check if RLS is enabled on admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to check their own admin status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'users_check_own_admin_status'
  ) THEN
    CREATE POLICY "users_check_own_admin_status" ON admin_users FOR SELECT
      TO authenticated USING (user_id = auth.uid());
  END IF;
END $$;