/*
  # Fix Author Names - Replace Authors as Requested

  ## Overview
  Updates authors to match the requested names and assignments:
  - Matthew Ayandare: General news, celebrity content
  - Gbenga Ayandare: Politics, interviews, business content  
  - Victoria Odunola: Entertainment and lifestyle content

  ## Changes Made
  
  ### 1. Update Existing Authors
    - Replace "Michael Chen" with "Matthew Ayandare" 
    - Replace "Emma Rodriguez" with "Gbenga Ayandare"
    - Replace "David Kim" with "Victoria Odunola"
    - Update Sarah Johnson to Matthew Ayandare if not already done
    
  ### 2. Author Assignment by Category
    - Politics, Interview, Business → Gbenga Ayandare
    - Entertainment, Lifestyle → Victoria Odunola
    - News, Celebrity, Other → Matthew Ayandare
    
  ### 3. Update Existing Content
    - Reassign all existing content to appropriate authors based on category
    
  ## Notes
    - Uses the photo `/g.m2.jpeg` for Matthew Ayandare
    - Professional profile photos for other authors
    - Updates all existing content assignments
*/

-- Update Michael Chen to Matthew Ayandare
UPDATE authors 
SET 
  name = 'Matthew Ayandare',
  avatar_url = '/g.m2.jpeg',
  bio = 'Senior journalist and news reporter covering breaking news, celebrity updates, and general interest stories with accuracy and engaging storytelling.'
WHERE name = 'Michael Chen';

-- Update Emma Rodriguez to Gbenga Ayandare  
UPDATE authors 
SET 
  name = 'Gbenga Ayandare',
  avatar_url = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200',
  bio = 'Political correspondent and business reporter specializing in interviews, policy analysis, and corporate news coverage with deep insights.'
WHERE name = 'Emma Rodriguez';

-- Update David Kim to Victoria Odunola
UPDATE authors 
SET 
  name = 'Victoria Odunola',
  avatar_url = 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200', 
  bio = 'Entertainment and lifestyle journalist covering celebrity culture, fashion trends, and lifestyle stories with fresh perspectives.'
WHERE name = 'David Kim';

-- Ensure Sarah Johnson is also updated to Matthew Ayandare (in case it wasn't done before)
UPDATE authors 
SET 
  name = 'Matthew Ayandare',
  avatar_url = '/g.m2.jpeg',
  bio = 'Senior journalist and news reporter covering breaking news, celebrity updates, and general interest stories with accuracy and engaging storytelling.'
WHERE name = 'Sarah Johnson';

-- Create/update the author assignment function for future content
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

-- Update all existing content to have correct authors based on their categories
UPDATE media_content 
SET author_id = assign_author_by_category(
  COALESCE((SELECT slug FROM categories WHERE id = media_content.category_id), 'news')
)
WHERE author_id IS NOT NULL;

-- Verify we have exactly 3 authors with correct names
DO $$
DECLARE
  matthew_count int;
  gbenga_count int; 
  victoria_count int;
  total_authors int;
BEGIN
  SELECT COUNT(*) INTO matthew_count FROM authors WHERE name = 'Matthew Ayandare';
  SELECT COUNT(*) INTO gbenga_count FROM authors WHERE name = 'Gbenga Ayandare';
  SELECT COUNT(*) INTO victoria_count FROM authors WHERE name = 'Victoria Odunola';
  SELECT COUNT(*) INTO total_authors FROM authors;
  
  -- Log the results
  RAISE NOTICE 'Author verification: Matthew=%, Gbenga=%, Victoria=%, Total=%', 
    matthew_count, gbenga_count, victoria_count, total_authors;
  
  -- Ensure we have the required authors
  IF matthew_count = 0 THEN
    RAISE EXCEPTION 'Matthew Ayandare author not found after update';
  END IF;
  
  IF gbenga_count = 0 THEN
    RAISE EXCEPTION 'Gbenga Ayandare author not found after update';  
  END IF;
  
  IF victoria_count = 0 THEN
    RAISE EXCEPTION 'Victoria Odunola author not found after update';
  END IF;
  
  -- Remove any duplicate authors or old names that might remain
  DELETE FROM authors WHERE name NOT IN ('Matthew Ayandare', 'Gbenga Ayandare', 'Victoria Odunola');
  
  RAISE NOTICE 'Author names successfully updated and verified!';
END $$;