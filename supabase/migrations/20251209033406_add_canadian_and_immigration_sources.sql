/*
  # Add Canadian Media and Immigration News Sources

  ## Overview
  Adds Canadian news sources and immigration-focused sources to support Canadian content and immigration updates.

  ## Changes Made
  
  ### 1. New Category
    - `Immigration` category for immigration-related news
  
  ### 2. Canadian News Sources
    - CBC News (Canadian Broadcasting Corporation)
    - Global News Canada
    - CTV News Canada
    - Toronto Star
    - The Globe and Mail
    - National Post
  
  ### 3. Immigration News Sources
    - CIC News (Canadian Immigration News)
    - Immigration.ca News
    - Moving2Canada
  
  ## Configuration
    - All sources set to RSS feed type
    - 30-minute fetch interval for major news
    - 60-minute interval for immigration updates
    - Appropriate category mapping for each source
    
  ## Notes
    - Sources use publicly available RSS feeds
    - All sources are active by default
    - Category mappings ensure proper content organization
*/

-- Add Immigration category
INSERT INTO categories (id, name, slug)
VALUES (
  gen_random_uuid(),
  'Immigration',
  'immigration'
)
ON CONFLICT (slug) DO NOTHING;

-- Add Canadian News Sources
INSERT INTO news_sources (id, name, source_type, feed_url, category_mapping, is_active, fetch_interval_minutes)
VALUES
  -- CBC News
  (
    gen_random_uuid(),
    'CBC News',
    'rss',
    'https://www.cbc.ca/cmlink/rss-topstories',
    '{"default": "news"}',
    true,
    30
  ),
  (
    gen_random_uuid(),
    'CBC News - Politics',
    'rss',
    'https://www.cbc.ca/cmlink/rss-politics',
    '{"default": "politics"}',
    true,
    30
  ),
  (
    gen_random_uuid(),
    'CBC News - Business',
    'rss',
    'https://www.cbc.ca/cmlink/rss-business',
    '{"default": "business"}',
    true,
    30
  ),
  -- Global News
  (
    gen_random_uuid(),
    'Global News Canada',
    'rss',
    'https://globalnews.ca/feed/',
    '{"default": "news"}',
    true,
    30
  ),
  (
    gen_random_uuid(),
    'Global News - Politics',
    'rss',
    'https://globalnews.ca/politics/feed/',
    '{"default": "politics"}',
    true,
    30
  ),
  -- CTV News
  (
    gen_random_uuid(),
    'CTV News Canada',
    'rss',
    'https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009',
    '{"default": "news"}',
    true,
    30
  ),
  (
    gen_random_uuid(),
    'CTV News - Politics',
    'rss',
    'https://www.ctvnews.ca/rss/ctvnews-ca-politics-public-rss-1.822291',
    '{"default": "politics"}',
    true,
    30
  ),
  -- Toronto Star
  (
    gen_random_uuid(),
    'Toronto Star',
    'rss',
    'https://www.thestar.com/search/?f=rss&t=article&c=news*&l=50&s=start_time&sd=desc',
    '{"default": "news"}',
    true,
    30
  ),
  -- The Globe and Mail
  (
    gen_random_uuid(),
    'The Globe and Mail',
    'rss',
    'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/canada/',
    '{"default": "news"}',
    true,
    30
  ),
  -- National Post
  (
    gen_random_uuid(),
    'National Post',
    'rss',
    'https://nationalpost.com/feed/',
    '{"default": "news"}',
    true,
    30
  )
ON CONFLICT DO NOTHING;

-- Add Immigration-Specific News Sources
INSERT INTO news_sources (id, name, source_type, feed_url, category_mapping, is_active, fetch_interval_minutes)
VALUES
  -- CIC News (Canadian Immigration News)
  (
    gen_random_uuid(),
    'CIC News - Immigration',
    'rss',
    'https://www.cicnews.com/feed',
    '{"default": "immigration"}',
    true,
    60
  ),
  -- Immigration.ca
  (
    gen_random_uuid(),
    'Immigration.ca News',
    'rss',
    'https://www.immigration.ca/feed/',
    '{"default": "immigration"}',
    true,
    60
  ),
  -- Moving2Canada
  (
    gen_random_uuid(),
    'Moving2Canada',
    'rss',
    'https://moving2canada.com/feed/',
    '{"default": "immigration"}',
    true,
    60
  ),
  -- Canada Visa (Immigration updates)
  (
    gen_random_uuid(),
    'CanadaVisa News',
    'rss',
    'https://www.canadavisa.com/news/feed',
    '{"default": "immigration"}',
    true,
    60
  )
ON CONFLICT DO NOTHING;
