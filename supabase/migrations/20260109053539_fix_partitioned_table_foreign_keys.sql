/*
  # Fix Foreign Key Relationships for Partitioned Tables

  1. Problem
    - Table partitioning broke foreign key relationships
    - PostgREST can't detect relationships without foreign keys
    - Frontend queries using `categories(*)` syntax failing
  
  2. Changes
    - Add foreign key constraints to parent table `media_content`
    - Add foreign key constraints to all partition tables
    - Ensures PostgREST can detect and use relationships
  
  3. Security
    - No RLS changes needed (already configured)
*/

-- Add foreign keys to parent table media_content
DO $$
BEGIN
  -- Add category_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_category_id_fkey' 
    AND conrelid = 'media_content'::regclass
  ) THEN
    ALTER TABLE media_content 
    ADD CONSTRAINT media_content_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;

  -- Add author_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_author_id_fkey' 
    AND conrelid = 'media_content'::regclass
  ) THEN
    ALTER TABLE media_content 
    ADD CONSTRAINT media_content_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES authors(id);
  END IF;

  -- Add source_id foreign key if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_source_id_fkey' 
    AND conrelid = 'media_content'::regclass
  ) THEN
    ALTER TABLE media_content 
    ADD CONSTRAINT media_content_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES news_sources(id);
  END IF;
END $$;

-- Add foreign keys to partition: media_content_2025_12
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2025_12_category_id_fkey' 
    AND conrelid = 'media_content_2025_12'::regclass
  ) THEN
    ALTER TABLE media_content_2025_12 
    ADD CONSTRAINT media_content_2025_12_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2025_12_author_id_fkey' 
    AND conrelid = 'media_content_2025_12'::regclass
  ) THEN
    ALTER TABLE media_content_2025_12 
    ADD CONSTRAINT media_content_2025_12_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES authors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2025_12_source_id_fkey' 
    AND conrelid = 'media_content_2025_12'::regclass
  ) THEN
    ALTER TABLE media_content_2025_12 
    ADD CONSTRAINT media_content_2025_12_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES news_sources(id);
  END IF;
END $$;

-- Add foreign keys to partition: media_content_2026_01
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_01_category_id_fkey' 
    AND conrelid = 'media_content_2026_01'::regclass
  ) THEN
    ALTER TABLE media_content_2026_01 
    ADD CONSTRAINT media_content_2026_01_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_01_author_id_fkey' 
    AND conrelid = 'media_content_2026_01'::regclass
  ) THEN
    ALTER TABLE media_content_2026_01 
    ADD CONSTRAINT media_content_2026_01_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES authors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_01_source_id_fkey' 
    AND conrelid = 'media_content_2026_01'::regclass
  ) THEN
    ALTER TABLE media_content_2026_01 
    ADD CONSTRAINT media_content_2026_01_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES news_sources(id);
  END IF;
END $$;

-- Add foreign keys to partition: media_content_2026_02
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_02_category_id_fkey' 
    AND conrelid = 'media_content_2026_02'::regclass
  ) THEN
    ALTER TABLE media_content_2026_02 
    ADD CONSTRAINT media_content_2026_02_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_02_author_id_fkey' 
    AND conrelid = 'media_content_2026_02'::regclass
  ) THEN
    ALTER TABLE media_content_2026_02 
    ADD CONSTRAINT media_content_2026_02_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES authors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_02_source_id_fkey' 
    AND conrelid = 'media_content_2026_02'::regclass
  ) THEN
    ALTER TABLE media_content_2026_02 
    ADD CONSTRAINT media_content_2026_02_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES news_sources(id);
  END IF;
END $$;

-- Add foreign keys to partition: media_content_2026_03
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_03_category_id_fkey' 
    AND conrelid = 'media_content_2026_03'::regclass
  ) THEN
    ALTER TABLE media_content_2026_03 
    ADD CONSTRAINT media_content_2026_03_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_03_author_id_fkey' 
    AND conrelid = 'media_content_2026_03'::regclass
  ) THEN
    ALTER TABLE media_content_2026_03 
    ADD CONSTRAINT media_content_2026_03_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES authors(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'media_content_2026_03_source_id_fkey' 
    AND conrelid = 'media_content_2026_03'::regclass
  ) THEN
    ALTER TABLE media_content_2026_03 
    ADD CONSTRAINT media_content_2026_03_source_id_fkey 
    FOREIGN KEY (source_id) REFERENCES news_sources(id);
  END IF;
END $$;
