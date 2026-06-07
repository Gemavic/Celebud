
-- Fix: categories and authors SELECT policies only allowed 'anon', not 'authenticated'
-- This caused joined queries to return empty results for logged-in users

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authors are viewable by everyone" ON authors;
CREATE POLICY "Authors are viewable by everyone" ON authors
  FOR SELECT TO anon, authenticated USING (true);
