-- Creates author_routing_rules live (never existed despite 2026-06 migration files)
-- and rebalances auto-fetched article attribution. Mirrors deploy file 28.

-- ===== 1. Create the routing table (never existed live until now) =====
create table if not exists author_routing_rules (
  id uuid primary key default gen_random_uuid(),
  region_label text not null,
  country_values text[] not null,
  author_id uuid not null references authors(id),
  priority int not null default 5,
  notes text,
  created_at timestamptz default now()
);

alter table author_routing_rules enable row level security;

drop policy if exists "admin_read_routing_rules" on author_routing_rules;
create policy "admin_read_routing_rules" on author_routing_rules
  for select to authenticated using (public.is_admin());

drop policy if exists "admin_write_routing_rules" on author_routing_rules;
create policy "admin_write_routing_rules" on author_routing_rules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create index if not exists idx_author_routing_rules_author_id
  on author_routing_rules(author_id);

-- ===== 2. Fill in the agreed coverage =====
delete from author_routing_rules;

insert into author_routing_rules (region_label, country_values, author_id, priority, notes)
values
  ('Nigeria',
   array['Nigeria','NG'],
   (select id from authors where name = 'Gbenga Ayandare' limit 1),
   1, 'Gbenga Ayandare - Nigerian politics, security, national affairs'),

  ('Middle East',
   array['Middle East','UAE','Saudi Arabia','Iran','Israel','Jordan','Iraq','Syria','Qatar','Kuwait','Lebanon','Turkey','Pakistan'],
   (select id from authors where name = 'Gbenga Ayandare' limit 1),
   2, 'Gbenga Ayandare - Middle East'),

  ('Asia',
   array['Asia','China','India','Japan','South Korea','Indonesia','Vietnam','Philippines','Malaysia','Bangladesh','Singapore','Thailand'],
   (select id from authors where name = 'Gbenga Ayandare' limit 1),
   3, 'Gbenga Ayandare - Asia'),

  ('Canada',
   array['Canada'],
   (select id from authors where name = 'Matthew Ayandare' limit 1),
   4, 'Matthew Ayandare - Canada (incl. financial/insurance/business)'),

  ('USA',
   array['USA','US','United States'],
   (select id from authors where name = 'Matthew Ayandare' limit 1),
   5, 'Matthew Ayandare - USA'),

  ('Europe',
   array['UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden','Portugal','Greece','Switzerland'],
   (select id from authors where name = 'Matthew Ayandare' limit 1),
   6, 'Matthew Ayandare - Europe'),

  ('Sports',
   array['Sports'],
   (select id from authors where name = 'Matthew Ayandare' limit 1),
   7, 'Matthew Ayandare - Sports (no dedicated sports byline currently live)'),

  ('Africa (non-Nigeria)',
   array['Africa','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda','Cameroon','Zimbabwe','Senegal'],
   (select id from authors where name = 'Bola Eboh' limit 1),
   8, 'Bola Eboh - Africa outside Nigeria'),

  ('Global / International',
   array['International','Global'],
   (select id from authors where name = 'Matthew Ayandare' limit 1),
   9, 'Matthew Ayandare - Global / International fallback');

-- Confirm: every rule resolves to a real reporter (no NULLs in assigned_to)
select r.priority, r.region_label, a.name as assigned_to
from author_routing_rules r
left join authors a on a.id = r.author_id
order by r.priority;

-- ===== 3. Retroactive rebalance of AUTO-FETCHED articles only =====
-- Manual articles (is_manual = true or no source) are never touched.
update media_content mc
set author_id = r.author_id
from news_sources ns
join author_routing_rules r
  on ns.country ilike any (r.country_values)
where mc.source_id = ns.id
  and coalesce(mc.is_manual, false) = false;

-- ===== 4. Result: per-reporter article counts =====
select a.name, count(mc.id) as articles
from media_content mc
join authors a on a.id = mc.author_id
group by a.name
order by articles desc;
