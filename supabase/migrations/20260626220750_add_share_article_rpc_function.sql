-- RPC function that the browser calls via supabase.rpc() (goes through /rest/v1/rpc/)
-- Uses pg_net server-side to call the edge function — completely bypasses browser CORS
CREATE OR REPLACE FUNCTION public.share_article_to_socials(article_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id bigint;
  v_url text := 'https://ucsuyrhlhmqezubfoszx.supabase.co/functions/v1/share-to-socials';
  v_anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc3V5cmhsaG1xZXp1YmZvc3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDE4NDgsImV4cCI6MjA4NjE3Nzg0OH0.h8-RhRoy0O9GGExPmDgh4q0QrZQLZBwtqxxaMYm-WiQ';
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

-- Only authenticated users (admins) may call this
REVOKE ALL ON FUNCTION public.share_article_to_socials(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.share_article_to_socials(uuid) TO authenticated;
