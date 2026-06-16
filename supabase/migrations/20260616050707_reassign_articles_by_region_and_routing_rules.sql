
-- ============================================================
-- AUTHOR ROUTING RULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS author_routing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_label text NOT NULL,
  country_values text[] NOT NULL,
  author_id uuid NOT NULL REFERENCES authors(id),
  priority int NOT NULL DEFAULT 5,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE author_routing_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_read_routing_rules" ON author_routing_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write_routing_rules" ON author_routing_rules FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

INSERT INTO author_routing_rules (region_label, country_values, author_id, priority, notes) VALUES
  ('Nigeria',              ARRAY['Nigeria','NG'],                          '13064316-d6a1-4a30-8a29-ab95d3514838', 1, 'Victoria Odunola — Nigeria-only correspondent'),
  ('North America',        ARRAY['Canada','USA','US','United States'],     '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 2, 'Matthew Ayandare'),
  ('Middle East',          ARRAY['Middle East','UAE','Saudi Arabia','Iran','Israel','Jordan','Iraq','Syria','Qatar','Kuwait','Lebanon','Turkey','Pakistan'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 3, 'Gbenga Ayandare'),
  ('Asia',                 ARRAY['Asia','China','India','Japan','South Korea','Indonesia','Vietnam','Philippines','Malaysia','Bangladesh','Singapore','Thailand'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 4, 'Gbenga Ayandare'),
  ('Europe',               ARRAY['UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden','Portugal','Greece','Switzerland'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 5, 'Matthew Ayandare — Europe'),
  ('Africa (non-Nigeria)', ARRAY['Africa','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda','Cameroon','Zimbabwe','Senegal'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 6, 'Matthew Ayandare — Africa'),
  ('Sports / Global',      ARRAY['Sports','International','Global'],       '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 7, 'Matthew Ayandare — Sports / International');

-- ============================================================
-- REASSIGN EXISTING ARTICLES
-- ============================================================

-- North America → Matthew
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Canada','USA','US','United States');

-- UK / Europe → Matthew
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden');

-- Sports / International → Matthew
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Sports','International','Global');

-- Middle East + Asia → Gbenga
UPDATE media_content mc
SET author_id = '74412c93-69bc-4c98-bbea-ab08321adc0c'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Middle East','UAE','Saudi Arabia','Iran','Israel','Jordan','Iraq','Syria','Asia','China','India','Japan','South Korea');

-- Nigeria without author → Victoria
UPDATE media_content mc
SET author_id = '13064316-d6a1-4a30-8a29-ab95d3514838'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Nigeria','NG') AND mc.author_id IS NULL;

-- Unassigned (no source): odd → Matthew, even → Gbenga
WITH unassigned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY published_at) AS rn
  FROM media_content
  WHERE author_id IS NULL AND media_type = 'article'
)
UPDATE media_content mc
SET author_id = CASE
  WHEN u.rn % 2 = 1 THEN '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
  ELSE                    '74412c93-69bc-4c98-bbea-ab08321adc0c'::uuid
END
FROM unassigned u
WHERE mc.id = u.id;
