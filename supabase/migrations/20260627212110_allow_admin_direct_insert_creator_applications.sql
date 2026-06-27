-- Allow admins to insert creator applications directly (bypasses need for RPC schema cache)
CREATE POLICY "admin_insert_creator_apps" ON creator_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
