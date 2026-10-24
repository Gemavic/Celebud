-- Featured-partner click counter (Dates.care first). Anyone may record a
-- click; only admins can read. Sign-ups themselves are counted on the
-- partner's side through the referral code.
create table if not exists public.partner_clicks (
  id bigint generated always as identity primary key,
  partner text not null check (partner ~ '^[a-z0-9-]{2,40}$'),
  placement text not null check (placement ~ '^[a-z0-9-]{2,40}$'),
  path text check (char_length(path) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists partner_clicks_partner_created_idx on public.partner_clicks (partner, created_at desc);
alter table public.partner_clicks enable row level security;
drop policy if exists "anyone records a click" on public.partner_clicks;
create policy "anyone records a click" on public.partner_clicks for insert to anon, authenticated with check (true);
drop policy if exists "admins read clicks" on public.partner_clicks;
create policy "admins read clicks" on public.partner_clicks for select to authenticated using (public.is_admin());

create or replace function public.guard_partner_click_rate() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if (select count(*) from public.partner_clicks where created_at > now() - interval '10 minutes') >= 500 then
    return null; -- silently drop floods
  end if;
  return new;
end $$;
drop trigger if exists partner_click_rate on public.partner_clicks;
create trigger partner_click_rate before insert on public.partner_clicks for each row execute function public.guard_partner_click_rate();
