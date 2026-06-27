-- Force PostgREST schema cache reload by recreating the function via migration API
-- The function exists in DB but PostgREST schema cache can't see it

DROP FUNCTION IF EXISTS public.share_article_to_socials(uuid);

CREATE OR REPLACE FUNCTION public.share_article_to_socials(article_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id bigint;
  v_url        text := 'https://ucsuyrhlhmqezubfoszx.supabase.co/functions/v1/share-to-socials';
  v_anon_key   text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc3V5cmhsaG1xZXp1YmZvc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDE4NDgsImV4cCI6MjA4NjE3Nzg0OH0.h8-RhRoy0O9GGExPmDgh4q0QrZQLZBwtqxxaMYm-WiQ';
BEGIN
  SELECT net.http_post(
    url     := v_url,
    body    := json_build_object('article_id', article_id)::jsonb,
    headers := json_build_object(
      'Content-Type',  'application/json',
      'apikey',        v_anon_key,
      'Authorization', 'Bearer ' || v_anon_key
    )::jsonb
  ) INTO v_request_id;

  RETURN json_build_object('queued', true, 'request_id', v_request_id);
END;
$$;

-- Revoke from PUBLIC, grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.share_article_to_socials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.share_article_to_socials(uuid) TO authenticated;

-- Notify PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
