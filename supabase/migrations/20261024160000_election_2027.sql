-- Election 2027 hub: candidates, voter-register figures, reader poll.
--
-- Fairness rules baked into the data model:
--   * Every candidate gets the same fields and the same page template.
--   * Candidates are listed in INEC ballot order, never by poll standing.
--   * Poll results are only ever exposed as aggregates, through
--     election_poll_results(), which also enforces the legal blackout.
--
-- Electoral Act 2026, s.100(1): no person or medium may publish material
-- promoting or opposing a candidate "within 24 hours immediately preceding
-- or on polling day". The poll closes and its results are withheld from
-- 00:00 WAT the day before polling day until polling day has ended.

create table if not exists public.election_candidates (
  id uuid primary key default gen_random_uuid(),
  race text not null default 'president-2027',
  ballot_order smallint not null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  name text not null check (char_length(name) between 3 and 120),
  party_abbr text not null check (char_length(party_abbr) between 1 and 12),
  party_name text check (char_length(party_name) <= 120),
  running_mate text check (char_length(running_mate) <= 120),
  photo_url text check (char_length(photo_url) <= 500),
  bio text check (char_length(bio) <= 4000),
  past_offices text check (char_length(past_offices) <= 2000),
  -- [{ "text": "...", "source_url": "https://...", "date": "2026-10-01" }]
  promises jsonb not null default '[]'::jsonb,
  -- [{ "title": "...", "url": "https://..." }] — where the profile facts came from
  sources jsonb not null default '[]'::jsonb,
  -- Words that find this candidate in CelebUD headlines, e.g. {"Tinubu"}
  search_terms text[] not null default '{}',
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (race, ballot_order)
);

create table if not exists public.election_voter_stats (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('total', 'zone', 'state', 'age', 'gender', 'pwd')),
  label text not null check (char_length(label) <= 80),
  zone text check (zone in ('North-West', 'North-East', 'North-Central', 'South-West', 'South-East', 'South-South')),
  value bigint not null check (value >= 0),
  sort smallint not null default 0,
  as_of date not null,
  source_title text check (char_length(source_title) <= 200),
  source_url text check (char_length(source_url) <= 500),
  unique (kind, label)
);

create table if not exists public.election_polls (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  race text not null default 'president-2027',
  question text not null,
  polling_day date not null,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.election_poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.election_polls(id) on delete cascade,
  candidate_id uuid references public.election_candidates(id) on delete set null,
  undecided boolean not null default false,
  device_id uuid not null,
  ip_hash text not null,
  age_band text check (age_band in ('18-34', '35-49', '50-69', '70+')),
  state text check (char_length(state) <= 40),
  zone text check (zone in ('North-West', 'North-East', 'North-Central', 'South-West', 'South-East', 'South-South', 'Diaspora')),
  gender text check (gender in ('male', 'female')),
  registered text check (registered in ('yes', 'no', 'unsure')),
  created_at timestamptz not null default now(),
  unique (poll_id, device_id),
  check (undecided or candidate_id is not null)
);
create index if not exists election_poll_votes_ip_idx on public.election_poll_votes(poll_id, ip_hash, created_at desc);

alter table public.election_candidates enable row level security;
alter table public.election_voter_stats enable row level security;
alter table public.election_polls enable row level security;
alter table public.election_poll_votes enable row level security;

drop policy if exists "Candidates are public" on public.election_candidates;
create policy "Candidates are public" on public.election_candidates for select to anon, authenticated using (is_active or public.is_admin());
drop policy if exists "Admins manage candidates" on public.election_candidates;
create policy "Admins manage candidates" on public.election_candidates for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Voter stats are public" on public.election_voter_stats;
create policy "Voter stats are public" on public.election_voter_stats for select to anon, authenticated using (true);
drop policy if exists "Admins manage voter stats" on public.election_voter_stats;
create policy "Admins manage voter stats" on public.election_voter_stats for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Polls are public" on public.election_polls;
create policy "Polls are public" on public.election_polls for select to anon, authenticated using (true);
drop policy if exists "Admins manage polls" on public.election_polls;
create policy "Admins manage polls" on public.election_polls for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Votes: no direct access for anyone but admins. Visitors vote through the
-- election-vote edge function and see only aggregates.
drop policy if exists "Admins read votes" on public.election_poll_votes;
create policy "Admins read votes" on public.election_poll_votes for select to authenticated using (public.is_admin());
drop policy if exists "Admins delete votes" on public.election_poll_votes;
create policy "Admins delete votes" on public.election_poll_votes for delete to authenticated using (public.is_admin());

-- Is the legal blackout in force for this poll right now?
create or replace function public.election_poll_in_blackout(p_polling_day date)
returns boolean
language sql
stable
as $$
  select now() >= ((p_polling_day - 1)::timestamp at time zone 'Africa/Lagos')
     and now() <  ((p_polling_day + 1)::timestamp at time zone 'Africa/Lagos');
$$;

-- Aggregated results only. Withheld during the blackout.
create or replace function public.election_poll_results(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  p public.election_polls;
  result jsonb;
begin
  select * into p from public.election_polls where slug = p_slug;
  if not found then return null; end if;
  if public.election_poll_in_blackout(p.polling_day) then
    return jsonb_build_object('blackout', true, 'polling_day', p.polling_day);
  end if;
  select jsonb_build_object(
    'blackout', false,
    'polling_day', p.polling_day,
    'is_open', p.is_open,
    'total', (select count(*) from election_poll_votes v where v.poll_id = p.id),
    'by_candidate', coalesce((
      select jsonb_agg(jsonb_build_object('candidate_id', candidate_id, 'undecided', undecided, 'votes', n) order by n desc)
      from (select candidate_id, undecided, count(*) n from election_poll_votes v where v.poll_id = p.id group by 1, 2) x), '[]'::jsonb),
    'by_zone', coalesce((
      select jsonb_agg(jsonb_build_object('zone', zone, 'candidate_id', candidate_id, 'undecided', undecided, 'votes', n))
      from (select zone, candidate_id, undecided, count(*) n from election_poll_votes v where v.poll_id = p.id and zone is not null group by 1, 2, 3) x), '[]'::jsonb),
    'by_age', coalesce((
      select jsonb_agg(jsonb_build_object('age_band', age_band, 'candidate_id', candidate_id, 'undecided', undecided, 'votes', n))
      from (select age_band, candidate_id, undecided, count(*) n from election_poll_votes v where v.poll_id = p.id and age_band is not null group by 1, 2, 3) x), '[]'::jsonb)
  ) into result;
  return result;
end $$;

grant execute on function public.election_poll_results(text) to anon, authenticated;
grant execute on function public.election_poll_in_blackout(date) to anon, authenticated;

-- Seed data (applied 24 Oct 2026). Candidates from INEC's final list as
-- reported by Channels TV and Vanguard; register figures from INEC as
-- reported 6 Oct 2026. Party names left null where no reliable source gave
-- the full name. States with conflicting figures across reports (FCT,
-- Gombe, Ondo/Yobe) are deliberately not seeded — add them from INEC's own
-- publication in Newsroom > Election.
-- See the live rows; this file records structure, the seed was run once
-- through the SQL editor.

-- 24 Oct 2026 (applied live as election_poll_results_by_state): results also
-- grouped by state, for the governorship polls. Governorship candidates for
-- Lagos (17), Ogun (13) and Oyo (16) seeded from INEC's final lists
-- (inecnigeria.org/documents/FINAL LIST - <STATE> STATE GOVERNORSHIP.pdf),
-- names kept in INEC's order; Oyo deputies not yet available. Polls:
-- governor-2027-lagos / -ogun / -oyo, polling day 2027-02-06.
