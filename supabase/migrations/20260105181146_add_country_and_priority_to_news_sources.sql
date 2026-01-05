/*
  # Add Country and Priority to News Sources

  1. Changes
    - Add `country` column to track source region (Nigeria, Canada, USA, Global)
    - Add `priority_weight` column to control fetching distribution
    - Update existing sources with country metadata based on source names
    
  2. Priority Weights
    - Nigeria: 50% of total articles
    - Canada: 20% of total articles
    - USA: 10% of total articles
    - Global: 30% of total articles
*/

-- Add country and priority_weight columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_sources' AND column_name = 'country'
  ) THEN
    ALTER TABLE news_sources ADD COLUMN country text DEFAULT 'Global';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news_sources' AND column_name = 'priority_weight'
  ) THEN
    ALTER TABLE news_sources ADD COLUMN priority_weight decimal(3,2) DEFAULT 1.0;
  END IF;
END $$;

-- Update Nigerian sources
UPDATE news_sources
SET country = 'Nigeria', priority_weight = 0.50
WHERE name IN (
  'Punch Nigeria - News',
  'Punch Nigeria - Politics',
  'Punch Nigeria - Business',
  'Punch Nigeria - Entertainment',
  'Vanguard Nigeria - News',
  'Vanguard Nigeria - Politics',
  'Vanguard Nigeria - Business',
  'The Guardian Nigeria - News',
  'The Guardian Nigeria - Politics',
  'The Guardian Nigeria - Business',
  'The Guardian Nigeria - Entertainment',
  'Premium Times Nigeria',
  'Daily Trust Nigeria',
  'This Day Nigeria',
  'Leadership Nigeria',
  'The Nation Nigeria',
  'Channels TV Nigeria',
  'Sahara Reporters',
  'The Cable Nigeria',
  'BusinessDay Nigeria',
  'Nigerian Tribune',
  'The Will Nigeria',
  'Blueprint Newspapers',
  'Nairaland'
);

-- Update Canadian sources
UPDATE news_sources
SET country = 'Canada', priority_weight = 0.20
WHERE name IN (
  'CBC News',
  'CBC News - Politics',
  'CBC News - Business',
  'CTV News Canada',
  'CTV News - Politics',
  'Global News Canada',
  'Global News - Politics',
  'Toronto Star',
  'National Post',
  'The Globe and Mail',
  'CIC News - Immigration',
  'CanadaVisa News',
  'Immigration.ca News',
  'Moving2Canada'
);

-- Update USA sources
UPDATE news_sources
SET country = 'USA', priority_weight = 0.10
WHERE name IN (
  'TechCrunch',
  'Wired',
  'The Verge',
  'Ars Technica',
  'MIT Technology Review',
  'ZDNet',
  'TechRadar',
  'NPR News',
  'Associated Press',
  'CNBC',
  'Forbes',
  'Forbes - Business',
  'Yahoo Finance',
  'MarketWatch'
);

-- Update Global sources (rest of the world)
UPDATE news_sources
SET country = 'Global', priority_weight = 0.30
WHERE country IS NULL OR country = 'Global';

-- Create index for faster querying by country
CREATE INDEX IF NOT EXISTS idx_news_sources_country ON news_sources(country) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_news_sources_priority ON news_sources(priority_weight) WHERE is_active = true;