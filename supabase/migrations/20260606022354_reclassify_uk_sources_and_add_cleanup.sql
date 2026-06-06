
-- Reclassify BBC News and The Guardian sources from Global to UK
UPDATE news_sources
SET country = 'UK'
WHERE country = 'Global'
  AND name IN (
    'BBC News', 'BBC Business', 'BBC News - Politics',
    'The Guardian Lifestyle', 'The Guardian - Society',
    'The Guardian Nigeria - Business', 'The Guardian Nigeria - Entertainment',
    'The Guardian Nigeria - News', 'The Guardian Nigeria - Politics'
  )
  AND name NOT LIKE '%Nigeria%';

-- Verify: only update non-Nigeria Guardian entries
UPDATE news_sources
SET country = 'UK'
WHERE country = 'Global'
  AND (
    name LIKE 'BBC%'
    OR name IN ('The Guardian Lifestyle', 'The Guardian - Society')
  );

-- Create function to delete articles older than 7 days
CREATE OR REPLACE FUNCTION cleanup_stale_articles()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM media_content
  WHERE published_at < NOW() - INTERVAL '7 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
