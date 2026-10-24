-- Newsroom tools (Oct 2026): reader questions, tribute submissions,
-- trackers, story radar and "living guide" review dates.
--
-- Everything the public can write to is INSERT-only for them: visitors can
-- submit an answer or a tribute, but can never read anyone else's (or even
-- their own) submission back. Admins see and manage everything. Nothing
-- submitted is ever published automatically — an editor turns it into an
-- article by hand.

-- ---------------------------------------------------------------------------
-- 1. Reader questions and answers
-- ---------------------------------------------------------------------------
create table if not exists public.reader_questions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  question text not null check (char_length(question) between 10 and 300),
  intro text check (char_length(intro) <= 1000),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reader_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.reader_questions(id) on delete cascade,
  name text check (char_length(name) <= 80),
  location text check (char_length(location) <= 80),
  answer text not null check (char_length(answer) between 2 and 3000),
  contact text check (char_length(contact) <= 120),
  may_quote boolean not null default false,
  status text not null default 'new' check (status in ('new', 'useful', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists reader_answers_question_idx on public.reader_answers(question_id, created_at desc);

alter table public.reader_questions enable row level security;
alter table public.reader_answers enable row level security;

drop policy if exists "Open questions are public" on public.reader_questions;
create policy "Open questions are public" on public.reader_questions
  for select to anon, authenticated using (is_open or public.is_admin());
drop policy if exists "Admins manage questions" on public.reader_questions;
create policy "Admins manage questions" on public.reader_questions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone can answer an open question" on public.reader_answers;
create policy "Anyone can answer an open question" on public.reader_answers
  for insert to anon, authenticated
  with check (
    status = 'new'
    and exists (select 1 from public.reader_questions q where q.id = question_id and q.is_open)
  );
drop policy if exists "Admins manage answers" on public.reader_answers;
create policy "Admins manage answers" on public.reader_answers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Tribute submissions from families
-- ---------------------------------------------------------------------------
create table if not exists public.tribute_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_name text not null check (char_length(submitter_name) between 2 and 100),
  submitter_contact text not null check (char_length(submitter_contact) between 5 and 150),
  relationship text check (char_length(relationship) <= 100),
  honoree_name text not null check (char_length(honoree_name) between 2 and 150),
  occasion text not null check (occasion in ('birthday', 'memorial', 'anniversary', 'achievement', 'other')),
  occasion_date date,
  story text not null check (char_length(story) between 50 and 8000),
  quotes text check (char_length(quotes) <= 3000),
  photos text[] not null default '{}' check (cardinality(photos) <= 6),
  consent boolean not null check (consent),
  status text not null default 'new' check (status in ('new', 'in_progress', 'drafted', 'declined')),
  article_id uuid references public.media_content(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists tribute_submissions_created_idx on public.tribute_submissions(created_at desc);

alter table public.tribute_submissions enable row level security;
drop policy if exists "Anyone can submit a tribute" on public.tribute_submissions;
create policy "Anyone can submit a tribute" on public.tribute_submissions
  for insert to anon, authenticated with check (status = 'new' and article_id is null);
drop policy if exists "Admins manage tributes" on public.tribute_submissions;
create policy "Admins manage tributes" on public.tribute_submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Flood guard for the two public forms: a burst of more than 40 submissions
-- in 10 minutes is a bot, not readers.
create or replace function public.guard_public_submission_rate()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare recent int;
begin
  if public.is_admin() then return new; end if;
  execute format('select count(*) from public.%I where created_at > now() - interval ''10 minutes''', tg_table_name)
    into recent;
  if recent >= 40 then
    raise exception 'Too many submissions right now — please try again in a few minutes.';
  end if;
  return new;
end $$;

drop trigger if exists reader_answers_rate on public.reader_answers;
create trigger reader_answers_rate before insert on public.reader_answers
  for each row execute function public.guard_public_submission_rate();
drop trigger if exists tribute_submissions_rate on public.tribute_submissions;
create trigger tribute_submissions_rate before insert on public.tribute_submissions
  for each row execute function public.guard_public_submission_rate();

-- ---------------------------------------------------------------------------
-- 3. Trackers (exchange rate, Express Entry draws, ...), kept by editors
-- ---------------------------------------------------------------------------
create table if not exists public.tracker_entries (
  id uuid primary key default gen_random_uuid(),
  tracker text not null check (tracker in ('ngn-cad', 'ngn-usd', 'express-entry', 'fuel-price')),
  observed_on date not null,
  value numeric not null,
  label text check (char_length(label) <= 120),
  extra numeric,
  source_url text check (char_length(source_url) <= 500),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (tracker, observed_on, label)
);
create index if not exists tracker_entries_idx on public.tracker_entries(tracker, observed_on desc);

alter table public.tracker_entries enable row level security;
drop policy if exists "Trackers are public" on public.tracker_entries;
create policy "Trackers are public" on public.tracker_entries
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage trackers" on public.tracker_entries;
create policy "Admins manage trackers" on public.tracker_entries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 4. Story radar + living guides, on the existing articles table
-- ---------------------------------------------------------------------------
alter table public.media_content
  add column if not exists radar_score smallint check (radar_score between 0 and 10),
  add column if not exists radar_notes jsonb,
  add column if not exists radar_scored_at timestamptz,
  add column if not exists radar_dismissed boolean not null default false,
  -- Set only when an editor deliberately reviews a guide's substance — not on
  -- every save, so "Updated" on the page means something to readers.
  add column if not exists content_updated_at timestamptz;

-- ---------------------------------------------------------------------------
-- 5. Storage
-- ---------------------------------------------------------------------------
-- Family photos for tribute submissions: images only, 5 MB each, public
-- bucket so editors can view them. Visitors may upload into pending/ but
-- cannot list, overwrite or delete anything.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tribute-uploads', 'tribute-uploads', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Visitors upload tribute photos" on storage.objects;
create policy "Visitors upload tribute photos" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'tribute-uploads' and (storage.foldername(name))[1] = 'pending');
drop policy if exists "Admins manage tribute photos" on storage.objects;
create policy "Admins manage tribute photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'tribute-uploads' and public.is_admin())
  with check (bucket_id = 'tribute-uploads' and public.is_admin());

-- Voice notes for interviews: private, admin only, 25 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsroom-audio', 'newsroom-audio', false, 26214400,
        array['audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac',
              'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/opus', 'audio/amr', 'video/mp4'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins manage newsroom audio" on storage.objects;
create policy "Admins manage newsroom audio" on storage.objects
  for all to authenticated
  using (bucket_id = 'newsroom-audio' and public.is_admin())
  with check (bucket_id = 'newsroom-audio' and public.is_admin());
