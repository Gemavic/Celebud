-- Force PostgREST schema cache to see admin_register_creator
-- Drop + recreate forces pgrst to re-index this function signature

DROP FUNCTION IF EXISTS public.admin_register_creator(text, text, text, text, text[], text, text, text, text);

CREATE OR REPLACE FUNCTION public.admin_register_creator(
  p_display_name  text,
  p_email         text    DEFAULT NULL,
  p_phone_number  text    DEFAULT NULL,
  p_bio           text    DEFAULT NULL,
  p_topics        text[]  DEFAULT NULL,
  p_instagram     text    DEFAULT NULL,
  p_twitter       text    DEFAULT NULL,
  p_status        text    DEFAULT 'approved',
  p_admin_notes   text    DEFAULT NULL
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
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    UNION ALL
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF p_email IS NOT NULL AND p_email <> '' AND EXISTS (
    SELECT 1 FROM creator_applications WHERE email = p_email
  ) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate_email');
  END IF;

  INSERT INTO creator_applications (
    display_name, email, phone_number, bio, sample_topics,
    instagram_handle, twitter_handle,
    status, revenue_share_pct, admin_notes, reviewed_at, onboarded_at
  )
  VALUES (
    p_display_name,
    NULLIF(TRIM(COALESCE(p_email, '')), ''),
    NULLIF(TRIM(COALESCE(p_phone_number, '')), ''),
    NULLIF(TRIM(COALESCE(p_bio, '')), ''),
    p_topics,
    NULLIF(TRIM(COALESCE(p_instagram, '')), ''),
    NULLIF(TRIM(COALESCE(p_twitter, '')), ''),
    p_status,
    50,
    NULLIF(TRIM(COALESCE(p_admin_notes, '')), ''),
    now(),
    CASE WHEN p_status = 'onboarded' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_register_creator FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_register_creator TO authenticated;

-- Signal PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
