
-- Step 1: Link author records to user accounts
ALTER TABLE authors ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Link Matthew Ayandare (mattocanada1)
UPDATE authors SET user_id = '4653203b-42d3-4a95-89f7-28eade48fbb7'
WHERE id = '61e083ba-518f-4ae3-8e30-21c1dbfe148a';

-- Link Gbenga Ayandare (histogm)
UPDATE authors SET user_id = 'c41d35d4-03b3-4a8d-8db6-d58cc8347186'
WHERE id = '74412c93-69bc-4c98-bbea-ab08321adc0c';

-- Link Victoria Odunola (victoryodunayo)
UPDATE authors SET user_id = 'a8aec000-6234-4d89-909e-ce8cd6437513'
WHERE id = '13064316-d6a1-4a30-8a29-ab95d3514838';

-- Step 2: Add submitted_by column to media_content to track which admin user published each article
ALTER TABLE media_content ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id);

-- Index for fast writer dashboard queries
CREATE INDEX IF NOT EXISTS idx_media_content_author_id ON media_content(author_id);
CREATE INDEX IF NOT EXISTS idx_media_content_submitted_by ON media_content(submitted_by);
CREATE INDEX IF NOT EXISTS idx_authors_user_id ON authors(user_id);
