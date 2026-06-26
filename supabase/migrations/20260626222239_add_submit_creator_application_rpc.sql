-- PostgreSQL RPC function for creator signup — bypasses PostgREST table schema cache
-- supabase.rpc('submit_creator_application', {...}) goes to /rest/v1/rpc/ which always works
CREATE OR REPLACE FUNCTION public.submit_creator_application(
  p_display_name  text,
  p_email         text,
  p_phone_number  text,
  p_bio           text     DEFAULT NULL,
  p_topics        text[]   DEFAULT NULL,
  p_instagram     text     DEFAULT NULL,
  p_twitter       text     DEFAULT NULL,
  p_tiktok        text     DEFAULT NULL,
  p_youtube       text     DEFAULT NULL,
  p_facebook_url  text     DEFAULT NULL,
  p_portfolio_url text     DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check for duplicate
  SELECT id INTO v_existing_id
  FROM creator_applications
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'duplicate');
  END IF;

  INSERT INTO creator_applications (
    user_id, display_name, email, phone_number, bio,
    sample_topics, instagram_handle, twitter_handle,
    tiktok_handle, youtube_channel, facebook_url, portfolio_url,
    status, revenue_share_pct, total_earnings, total_views, articles_count
  ) VALUES (
    v_user_id,
    trim(p_display_name),
    trim(p_email),
    nullif(trim(coalesce(p_phone_number, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
    nullif(p_topics, '{}'),
    nullif(trim(coalesce(p_instagram, '')), ''),
    nullif(trim(coalesce(p_twitter, '')), ''),
    nullif(trim(coalesce(p_tiktok, '')), ''),
    nullif(trim(coalesce(p_youtube, '')), ''),
    nullif(trim(coalesce(p_facebook_url, '')), ''),
    nullif(trim(coalesce(p_portfolio_url, '')), ''),
    'pending', 50, 0, 0, 0
  );

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_creator_application(text,text,text,text,text[],text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_creator_application(text,text,text,text,text[],text,text,text,text,text,text) TO authenticated;
