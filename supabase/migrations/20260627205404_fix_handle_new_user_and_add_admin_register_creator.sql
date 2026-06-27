-- Make handle_new_user trigger more resilient and add admin_register_creator function

-- Fix 1: Safer handle_new_user that won't fail on any edge case
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
BEGIN
  -- Build a safe username: prefer metadata, fall back to email prefix, never blank
  v_username := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''),
    NULLIF(TRIM(split_part(NEW.email, '@', 1)), ''),
    'user_' || substr(NEW.id::text, 1, 8)
  );

  INSERT INTO public.profiles (id, username, display_name, full_name, avatar_url, is_admin, created_at, updated_at)
  VALUES (
    NEW.id,
    v_username,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''), v_username),
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), v_username),
    NEW.raw_user_meta_data->>'avatar_url',
    false,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username     = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    full_name    = EXCLUDED.full_name,
    avatar_url   = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    updated_at   = now();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never let profile creation block auth signup
  RAISE WARNING 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Fix 2: Admin function to manually register a creator
-- Admin bypasses RLS; checks caller is admin before allowing insert
CREATE OR REPLACE FUNCTION public.admin_register_creator(
  p_display_name  text,
  p_email         text,
  p_phone_number  text DEFAULT NULL,
  p_bio           text DEFAULT NULL,
  p_topics        text[] DEFAULT NULL,
  p_instagram     text DEFAULT NULL,
  p_twitter       text DEFAULT NULL,
  p_status        text DEFAULT 'approved',
  p_admin_notes   text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_new_id   uuid;
BEGIN
  -- Verify caller is admin
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    UNION
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Check for duplicate email
  IF p_email IS NOT NULL AND EXISTS (
    SELECT 1 FROM creator_applications WHERE email = p_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate_email');
  END IF;

  INSERT INTO creator_applications (
    display_name, email, phone_number, bio, sample_topics,
    instagram_handle, twitter_handle,
    status, revenue_share_pct, admin_notes, reviewed_at,
    onboarded_at
  )
  VALUES (
    p_display_name,
    p_email,
    p_phone_number,
    p_bio,
    p_topics,
    p_instagram,
    p_twitter,
    p_status,
    50,
    p_admin_notes,
    now(),
    CASE WHEN p_status = 'onboarded' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_register_creator FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_register_creator TO authenticated;

NOTIFY pgrst, 'reload schema';
