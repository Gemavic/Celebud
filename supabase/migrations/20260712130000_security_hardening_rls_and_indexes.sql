/*
  # Security hardening: column-level profile privacy, analytics RLS, indexes

  From the full site audit (2026-07-12):
  1. profiles was granting SELECT on all columns to anon/authenticated, so
     Stripe subscription IDs and admin status were readable for every
     account via the public "show commenter name/avatar" policy. Restrict
     the public grant to safe display columns only; add get_my_profile()
     so a signed-in user can still read their own full profile (including
     is_admin) safely, since it's scoped to auth.uid() server-side.
  2. ad_clicks was readable by any authenticated user; view_events was
     readable by anyone with no login. Both restricted to admins.
  3. author_routing_rules was readable by any authenticated user. Restricted
     to admins.
  4. Missing indexes on two newer foreign key columns.
*/

revoke select on public.profiles from anon, authenticated;
grant select (id, username, display_name, avatar_url, created_at) on public.profiles to anon, authenticated;

create or replace function public.get_my_profile()
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  is_admin boolean,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url, p.is_admin, p.created_at
  from public.profiles p
  where p.id = auth.uid()
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

drop policy if exists "ad_clicks_public_read" on ad_clicks;
drop policy if exists "ad_clicks_admin_read" on ad_clicks;
create policy "ad_clicks_admin_read" on ad_clicks for select to authenticated using (public.is_admin());

drop policy if exists "view_events_anyone_read" on view_events;
drop policy if exists "view_events_admin_read" on view_events;
create policy "view_events_admin_read" on view_events for select to authenticated using (public.is_admin());

do $$
begin
  if to_regclass('public.author_routing_rules') is not null then
    execute 'drop policy if exists "admin_read_routing_rules" on author_routing_rules';
    execute 'create policy "admin_read_routing_rules" on author_routing_rules for select to authenticated using (public.is_admin())';
    execute 'create index if not exists idx_author_routing_rules_author_id on author_routing_rules(author_id)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.reporter_applications') is not null then
    execute 'create index if not exists idx_reporter_applications_author_id on reporter_applications(author_id)';
  end if;
end $$;
