-- ============================================================
-- Rebalance Author Routing Rules
-- ============================================================
-- Previous routing gave Matthew ~72% of articles and starved
-- Chidinma (0) and Adebayo (0). This redistribution follows the
-- author bios and hierarchical order:
--
-- Matthew Ayandare  — Editor-in-Chief, covers the most countries
-- Chidinma Okafor   — Business/finance, Canadian markets
-- Adebayo Ogundimu  — Sports correspondent
-- Gbenga Ayandare   — Nigerian politics/security, Middle East, Asia
-- Victoria Odunola  — Entertainment/celebrity/lifestyle

-- Clear existing rules
DELETE FROM author_routing_rules;

-- Author IDs:
-- Matthew:  61e083ba-518f-4ae3-8e30-21c1dbfe148a
-- Gbenga:   74412c93-69bc-4c98-bbea-ab08321adc0c
-- Victoria: 13064316-d6a1-4a30-8a29-ab95d3514838
-- Chidinma: 82957a67-65ed-4fd5-85a6-ee1d4845808c
-- Adebayo:  1e392a8c-bd04-4f58-b957-ff2217539f70

INSERT INTO author_routing_rules (region_label, country_values, author_id, priority, notes) VALUES
  -- Priority 1: Nigeria → Gbenga (politics/security correspondent)
  ('Nigeria', ARRAY['Nigeria','NG'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 1, 'Gbenga Ayandare — Nigerian politics, security, African affairs'),

  -- Priority 2: Canada → Chidinma (business/finance, Canadian markets)
  ('Canada', ARRAY['Canada'], '82957a67-65ed-4fd5-85a6-ee1d4845808c', 2, 'Chidinma Okafor — Canadian markets and global economics'),

  -- Priority 3: USA → Matthew (Editor-in-Chief, North America)
  ('USA', ARRAY['USA','US','United States'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 3, 'Matthew Ayandare — USA'),

  -- Priority 4: Sports → Adebayo (sports correspondent)
  ('Sports', ARRAY['Sports'], '1e392a8c-bd04-4f58-b957-ff2217539f70', 4, 'Adebayo Ogundimu — football, basketball, international athletics'),

  -- Priority 5: Europe → Matthew
  ('Europe', ARRAY['UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden','Portugal','Greece','Switzerland'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 5, 'Matthew Ayandare — Europe'),

  -- Priority 6: Middle East → Gbenga
  ('Middle East', ARRAY['Middle East','UAE','Saudi Arabia','Iran','Israel','Jordan','Iraq','Syria','Qatar','Kuwait','Lebanon','Turkey','Pakistan'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 6, 'Gbenga Ayandare — Middle East'),

  -- Priority 7: Asia → Gbenga
  ('Asia', ARRAY['Asia','China','India','Japan','South Korea','Indonesia','Vietnam','Philippines','Malaysia','Bangladesh','Singapore','Thailand'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 7, 'Gbenga Ayandare — Asia'),

  -- Priority 8: Africa (non-Nigeria) → Matthew
  ('Africa (non-Nigeria)', ARRAY['Africa','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda','Cameroon','Zimbabwe','Senegal'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 8, 'Matthew Ayandare — Africa (non-Nigeria)'),

  -- Priority 9: Global / International fallback → Matthew
  ('Global / International', ARRAY['International','Global'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 9, 'Matthew Ayandare — Global / International fallback');

-- ============================================================
-- Reassign existing articles to match new routing
-- ============================================================

-- Canada → Chidinma
UPDATE media_content mc
SET author_id = '82957a67-65ed-4fd5-85a6-ee1d4845808c'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country = 'Canada';

-- Sports → Adebayo
UPDATE media_content mc
SET author_id = '1e392a8c-bd04-4f58-b957-ff2217539f70'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country = 'Sports';

-- Nigeria → Gbenga
UPDATE media_content mc
SET author_id = '74412c93-69bc-4c98-bbea-ab08321adc0c'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Nigeria','NG');

-- USA → Matthew (already correct, but ensure)
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('USA','US','United States');

-- UK/Europe → Matthew (already correct, but ensure)
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden');

-- Any unassigned articles with no source: distribute round-robin
-- among all 5 reporters to ensure everyone gets coverage
WITH unassigned AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY published_at) AS rn
  FROM media_content
  WHERE author_id IS NULL AND media_type = 'article'
)
UPDATE media_content mc
SET author_id = CASE
  WHEN u.rn % 5 = 1 THEN '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid  -- Matthew
  WHEN u.rn % 5 = 2 THEN '74412c93-69bc-4c98-bbea-ab08321adc0c'::uuid  -- Gbenga
  WHEN u.rn % 5 = 3 THEN '13064316-d6a1-4a30-8a29-ab95d3514838'::uuid  -- Victoria
  WHEN u.rn % 5 = 4 THEN '82957a67-65ed-4fd5-85a6-ee1d4845808c'::uuid  -- Chidinma
  ELSE                     '1e392a8c-bd04-4f58-b957-ff2217539f70'::uuid  -- Adebayo
END
FROM unassigned u
WHERE mc.id = u.id;
