/*
  # Fix ad tracking accuracy and add rate limiting

  advertisements had no UPDATE policy for anon/authenticated at all, so the
  frontend's direct impression_count/click_count increments were silently
  failing under RLS the whole time — event rows in ad_impressions/ad_clicks
  were still recording, just not the running totals the Ad Revenue dashboard
  reads. Ad tracking now goes through the "track-ad-event" edge function
  (service-role, IP rate-limited), which calls this atomic increment function.
  Direct-write policies are removed since nothing should write these tables
  except that function. ad_impressions was also anon-readable, same issue as
  ad_clicks/view_events fixed in the previous migration.
*/

create or replace function public.increment_ad_stat(p_ad_id uuid, p_event text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event = 'impression' then
    update advertisements set impression_count = coalesce(impression_count, 0) + 1 where id = p_ad_id;
  elsif p_event = 'click' then
    update advertisements set click_count = coalesce(click_count, 0) + 1 where id = p_ad_id;
  end if;
end;
$$;

revoke all on function public.increment_ad_stat(uuid, text) from public, anon, authenticated;

do $$
begin
  if to_regclass('public.ad_impressions') is not null then
    execute 'drop policy if exists "ad_impressions_public_insert" on ad_impressions';
    execute 'drop policy if exists "ad_impressions_public_read" on ad_impressions';
    execute 'create policy "ad_impressions_admin_read" on ad_impressions for select to authenticated using (public.is_admin())';
  end if;
end $$;

do $$
begin
  if to_regclass('public.ad_clicks') is not null then
    execute 'drop policy if exists "ad_clicks_anyone_insert" on ad_clicks';
  end if;
end $$;
