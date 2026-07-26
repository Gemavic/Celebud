/*
  # Add per-category author bio profiles

  Replaces the single fixed authors.bio/authors.disclaimer pair with a new
  author_bio_profiles table: each author can have multiple bio+disclaimer
  profiles, each tagged to one or more category slugs (e.g. Matthew Ayandare
  gets a "Fin-Advisor" profile tagged to fin-advisor/business/finance-accounting,
  and a separate "General" profile for everything else), so the right bio
  shows depending on the article's niche instead of always the same one.

  Also adds author_bio_snapshot/author_disclaimer_snapshot to media_content:
  the resolved bio+disclaimer text is stored on the article row at write time
  (by fetch-news or the admin editor), so historical articles stay stable
  even if a profile is edited later.

  Backfills each existing author's current bio/disclaimer as their new
  "General" default profile, so nothing changes until niche-specific
  profiles are added.
*/

create table if not exists author_bio_profiles (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references authors(id) on delete cascade,
  label text not null,
  bio text default '',
  disclaimer text default '',
  category_slugs text[] not null default '{}',
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_author_bio_profiles_author on author_bio_profiles(author_id);

create unique index if not exists idx_author_bio_profiles_one_default
  on author_bio_profiles(author_id) where (is_default = true);

alter table author_bio_profiles enable row level security;

create policy "author_bio_profiles_public_read" on author_bio_profiles
  for select to anon, authenticated using (true);

create policy "Authenticated users can create author bio profiles" on author_bio_profiles
  for insert to authenticated with check (true);

create policy "Authenticated users can update author bio profiles" on author_bio_profiles
  for update to authenticated using (true) with check (true);

alter table media_content add column if not exists author_bio_snapshot text;
alter table media_content add column if not exists author_disclaimer_snapshot text;

insert into author_bio_profiles (author_id, label, bio, disclaimer, category_slugs, is_default)
select id, 'General', coalesce(bio, ''), coalesce(disclaimer, ''), '{}', true
from authors
where not exists (
  select 1 from author_bio_profiles p where p.author_id = authors.id and p.is_default = true
);

notify pgrst, 'reload schema';
