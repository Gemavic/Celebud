-- ============================================================
-- 1. Rename authors
-- ============================================================
-- Adebayo Ogundimu -> Amusa Babatunde (Sports)
UPDATE authors
SET name = 'Amusa Babatunde',
    bio = 'Sports correspondent covering football, basketball, and international athletics.'
WHERE name = 'Adebayo Ogundimu';

-- Chidinma Okafor -> Princess Bola (Nigeria and African News)
UPDATE authors
SET name = 'Princess Bola',
    bio = 'Nigeria and African news correspondent covering politics, society, and regional affairs.'
WHERE name = 'Chidinma Okafor';

-- ============================================================
-- 2. Update routing rules
-- ============================================================
-- Author IDs (unchanged):
-- Matthew:  61e083ba-518f-4ae3-8e30-21c1dbfe148a
-- Gbenga:   74412c93-69bc-4c98-bbea-ab08321adc0c
-- Victoria: 13064316-d6a1-4a30-8a29-ab95d3514838
-- Princess Bola (was Chidinma): 82957a67-65ed-4fd5-85a6-ee1d4845808c
-- Amusa Babatunde (was Adebayo): 1e392a8c-bd04-4f58-b957-ff2217539f70

DELETE FROM author_routing_rules;

INSERT INTO author_routing_rules (region_label, country_values, author_id, priority, notes) VALUES
  -- Priority 1: Nigeria -> Princess Bola
  ('Nigeria', ARRAY['Nigeria','NG'], '82957a67-65ed-4fd5-85a6-ee1d4845808c', 1, 'Princess Bola — Nigeria and African news'),

  -- Priority 2: Canada -> Matthew (financial/insurance/business + general)
  ('Canada', ARRAY['Canada'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 2, 'Matthew Ayandare — Canada (financial, insurance, business, general)'),

  -- Priority 3: USA -> Matthew
  ('USA', ARRAY['USA','US','United States'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 3, 'Matthew Ayandare — USA'),

  -- Priority 4: Sports -> Amusa Babatunde
  ('Sports', ARRAY['Sports'], '1e392a8c-bd04-4f58-b957-ff2217539f70', 4, 'Amusa Babatunde — football, basketball, international athletics'),

  -- Priority 5: Europe -> Matthew
  ('Europe', ARRAY['UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden','Portugal','Greece','Switzerland'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 5, 'Matthew Ayandare — Europe'),

  -- Priority 6: Middle East -> Gbenga
  ('Middle East', ARRAY['Middle East','UAE','Saudi Arabia','Iran','Israel','Jordan','Iraq','Syria','Qatar','Kuwait','Lebanon','Turkey','Pakistan'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 6, 'Gbenga Ayandare — Middle East'),

  -- Priority 7: Asia -> Gbenga
  ('Asia', ARRAY['Asia','China','India','Japan','South Korea','Indonesia','Vietnam','Philippines','Malaysia','Bangladesh','Singapore','Thailand'], '74412c93-69bc-4c98-bbea-ab08321adc0c', 7, 'Gbenga Ayandare — Asia'),

  -- Priority 8: Africa (non-Nigeria) -> Princess Bola
  ('Africa (non-Nigeria)', ARRAY['Africa','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda','Cameroon','Zimbabwe','Senegal'], '82957a67-65ed-4fd5-85a6-ee1d4845808c', 8, 'Princess Bola — Africa (non-Nigeria)'),

  -- Priority 9: Global / International fallback -> Matthew
  ('Global / International', ARRAY['International','Global'], '61e083ba-518f-4ae3-8e30-21c1dbfe148a', 9, 'Matthew Ayandare — Global / International fallback');

-- ============================================================
-- 3. Reassign existing articles
-- ============================================================

-- Canada -> Matthew (all Canadian articles, including financial/business)
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country = 'Canada';

-- Sports -> Amusa Babatunde
UPDATE media_content mc
SET author_id = '1e392a8c-bd04-4f58-b957-ff2217539f70'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country = 'Sports';

-- Nigeria -> Princess Bola
UPDATE media_content mc
SET author_id = '82957a67-65ed-4fd5-85a6-ee1d4845808c'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('Nigeria','NG');

-- USA -> Matthew
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('USA','US','United States');

-- UK/Europe -> Matthew
UPDATE media_content mc
SET author_id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a'::uuid
FROM news_sources ns
WHERE mc.source_id = ns.id AND ns.country IN ('UK','Europe','France','Germany','Spain','Italy','Netherlands','Poland','Sweden');

-- Entertainment/Celebrity/Lifestyle -> Victoria (category-based, regardless of source)
UPDATE media_content
SET author_id = '13064316-d6a1-4a30-8a29-ab95d3514838'::uuid
WHERE category_id IN (
  'a99ef4f2-2da1-4e44-9708-5ba6672a445e',  -- Celebrity
  'd73839eb-b192-45ce-8b51-a80ecd7d67a3',  -- Entertainment
  '8e12e4d2-5c94-4e5e-a6cd-c9475d701032'   -- Lifestyle
)
AND is_manual = false;

-- Any remaining unassigned: round-robin among all 5 reporters
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
  WHEN u.rn % 5 = 4 THEN '82957a67-65ed-4fd5-85a6-ee1d4845808c'::uuid  -- Princess Bola
  ELSE                     '1e392a8c-bd04-4f58-b957-ff2217539f70'::uuid  -- Amusa Babatunde
END
FROM unassigned u
WHERE mc.id = u.id;
