
-- Allow authenticated users to insert authors
CREATE POLICY "Authenticated users can create authors"
  ON authors FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update authors  
CREATE POLICY "Authenticated users can update authors"
  ON authors FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
