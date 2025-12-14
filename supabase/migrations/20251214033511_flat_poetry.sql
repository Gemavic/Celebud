/*
  # Remove Hardcoded Content and Update Authors

  ## Overview
  Removes all hardcoded/placeholder content and updates authors for different content categories.

  ## Changes Made
  
  ### 1. Remove Hardcoded Content
    - Delete all sample media content (placeholder articles)
    - Keep only content fetched from real news sources
    
  ### 2. Update Authors
    - Replace Michael Chen with Matthew Ayandare (politics, interviews, business)
    - Replace Sarah Johnson with Matthew Ayandare (already done in previous migration)
    - Replace Emma Rodriguez with Gbenga Ayandare (politics, interviews, business)
    - Replace David Kim with Victoria Odunola (entertainment, lifestyle)
    - Add new authors: Gbenga Ayandare and Victoria Odunola
    
  ### 3. Author Category Mapping
    - Matthew Ayandare: General news, celebrity
    - Gbenga Ayandare: Politics, interviews, business
    - Victoria Odunola: Entertainment, lifestyle
    
  ## Notes
    - Only live news from RSS feeds will remain
    - Authors will be properly assigned based on content category
    - All placeholder content will be removed
*/

-- ============================================================================
-- 1. REMOVE ALL HARDCODED/PLACEHOLDER CONTENT
-- ============================================================================

-- Delete all existing media content (these are placeholder articles)
DELETE FROM media_content WHERE source_id IS NULL;

-- Also delete any content that might have been manually created for testing
DELETE FROM media_content WHERE slug IN (
  'behind-scenes-biggest-blockbuster',
  'tech-billionaire-success-secrets',
  'surprise-album-first-listen',
  'celebrity-couple-business-venture',
  'streaming-wars-reshaping-entertainment',
  'red-carpet-fashion-highlights'
);

-- ============================================================================
-- 2. UPDATE EXISTING AUTHORS
-- ============================================================================

-- Update Michael Chen to Matthew Ayandare (he's already been updated from Sarah Johnson)
UPDATE authors 
SET 
  name = 'Matthew Ayandare',
  avatar_url = '/g.m2.jpeg',
  bio = 'Senior journalist covering general news, celebrity updates, and breaking stories with a focus on accuracy and engaging storytelling.'
WHERE name = 'Michael Chen';

-- Update Emma Rodriguez to Gbenga Ayandare
UPDATE authors 
SET 
  name = 'Gbenga Ayandare',
  avatar_url = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200',
  bio = 'Political correspondent and business reporter specializing in interviews, policy analysis, and corporate news coverage.'
WHERE name = 'Emma Rodriguez';

-- Update David Kim to Victoria Odunola
UPDATE authors 
SET 
  name = 'Victoria Odunola',
  avatar_url = 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
  bio = 'Entertainment and lifestyle journalist covering celebrity culture, fashion trends, and lifestyle stories with a fresh perspective.'
WHERE name = 'David Kim';

-- ============================================================================
-- 3. ENSURE PROPER AUTHOR ASSIGNMENT FOR FUTURE CONTENT
-- ============================================================================

-- Create a function to assign authors based on category
CREATE OR REPLACE FUNCTION assign_author_by_category(category_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  author_id uuid;
BEGIN
  -- Assign authors based on category
  CASE category_slug
    WHEN 'politics', 'interview', 'business' THEN
      SELECT id INTO author_id FROM authors WHERE name = 'Gbenga Ayandare' LIMIT 1;
    WHEN 'entertainment', 'lifestyle' THEN
      SELECT id INTO author_id FROM authors WHERE name = 'Victoria Odunola' LIMIT 1;
    ELSE
      -- Default to Matthew Ayandare for news, celebrity, and other categories
      SELECT id INTO author_id FROM authors WHERE name = 'Matthew Ayandare' LIMIT 1;
  END CASE;
  
  -- If no specific author found, use Matthew Ayandare as default
  IF author_id IS NULL THEN
    SELECT id INTO author_id FROM authors WHERE name = 'Matthew Ayandare' LIMIT 1;
  END IF;
  
  RETURN author_id;
END;
$$;

-- ============================================================================
-- 4. UPDATE NEWS FETCH PROCESS TO USE PROPER AUTHORS
-- ============================================================================

-- Update any existing content from news sources to have proper authors
UPDATE media_content 
SET author_id = assign_author_by_category(
  (SELECT slug FROM categories WHERE id = media_content.category_id)
)
WHERE source_id IS NOT NULL;

-- ============================================================================
-- 5. CLEAN UP UNUSED TAGS AND CONTENT TAGS
-- ============================================================================

-- Remove content_tags for deleted content
DELETE FROM content_tags 
WHERE content_id NOT IN (SELECT id FROM media_content);

-- Remove unused tags (optional - keep for future use)
-- DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM content_tags);

-- ============================================================================
-- 6. VERIFY AUTHOR SETUP
-- ============================================================================

-- Ensure we have exactly the authors we need
DO $$
DECLARE
  matthew_count int;
  gbenga_count int;
  victoria_count int;
BEGIN
  SELECT COUNT(*) INTO matthew_count FROM authors WHERE name = 'Matthew Ayandare';
  SELECT COUNT(*) INTO gbenga_count FROM authors WHERE name = 'Gbenga Ayandare';
  SELECT COUNT(*) INTO victoria_count FROM authors WHERE name = 'Victoria Odunola';
  
  -- Log the results
  RAISE NOTICE 'Author verification: Matthew=%, Gbenga=%, Victoria=%', matthew_count, gbenga_count, victoria_count;
  
  -- Ensure we have all required authors
  IF matthew_count = 0 THEN
    RAISE EXCEPTION 'Matthew Ayandare author not found';
  END IF;
  
  IF gbenga_count = 0 THEN
    RAISE EXCEPTION 'Gbenga Ayandare author not found';
  END IF;
  
  IF victoria_count = 0 THEN
    RAISE EXCEPTION 'Victoria Odunola author not found';
  END IF;
END $$;

-- ============================================================================
-- 7. ADD COMMENT FOR FUTURE REFERENCE
-- ============================================================================

COMMENT ON FUNCTION assign_author_by_category(text) IS 'Assigns appropriate author based on content category: Gbenga Ayandare for politics/interviews/business, Victoria Odunola for entertainment/lifestyle, Matthew Ayandare for news/celebrity/other';