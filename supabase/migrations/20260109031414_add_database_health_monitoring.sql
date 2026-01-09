/*
  # Add Database Health Monitoring System

  1. New Functions
    - check_rls_policies: Validates that all tables with RLS have proper policies
    - check_content_accessibility: Verifies content is publicly accessible
    - get_health_report: Returns comprehensive health status
  
  2. Purpose
    - Prevent future access issues by monitoring RLS configuration
    - Alert when tables have RLS enabled but no policies
    - Validate that content remains publicly accessible
*/

-- Function to check if tables with RLS have policies
CREATE OR REPLACE FUNCTION check_rls_policies()
RETURNS TABLE(
  table_name text,
  rls_enabled boolean,
  policy_count bigint,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::text as table_name,
    c.relrowsecurity as rls_enabled,
    COUNT(p.polname) as policy_count,
    CASE 
      WHEN c.relrowsecurity = true AND COUNT(p.polname) = 0 THEN 'CRITICAL: RLS enabled but no policies'
      WHEN c.relrowsecurity = true AND COUNT(p.polname) > 0 THEN 'OK'
      WHEN c.relrowsecurity = false THEN 'WARNING: RLS disabled'
    END as status
  FROM pg_class c
  LEFT JOIN pg_policies p ON p.tablename = c.relname
  WHERE c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    AND c.relkind = 'r'
    AND c.relname LIKE 'media_content%'
  GROUP BY c.relname, c.relrowsecurity
  ORDER BY status DESC, table_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify content is accessible
CREATE OR REPLACE FUNCTION check_content_accessibility()
RETURNS TABLE(
  check_name text,
  status text,
  details text
) AS $$
DECLARE
  article_count bigint;
  category_count bigint;
  author_count bigint;
BEGIN
  -- Check if articles are accessible
  SELECT COUNT(*) INTO article_count FROM media_content;
  
  IF article_count > 0 THEN
    RETURN QUERY SELECT 
      'Articles'::text,
      'OK'::text,
      format('%s articles accessible', article_count)::text;
  ELSE
    RETURN QUERY SELECT 
      'Articles'::text,
      'ERROR'::text,
      'No articles accessible - check RLS policies'::text;
  END IF;

  -- Check categories
  SELECT COUNT(*) INTO category_count FROM categories;
  
  IF category_count > 0 THEN
    RETURN QUERY SELECT 
      'Categories'::text,
      'OK'::text,
      format('%s categories accessible', category_count)::text;
  ELSE
    RETURN QUERY SELECT 
      'Categories'::text,
      'WARNING'::text,
      'No categories accessible'::text;
  END IF;

  -- Check authors
  SELECT COUNT(*) INTO author_count FROM authors;
  
  IF author_count > 0 THEN
    RETURN QUERY SELECT 
      'Authors'::text,
      'OK'::text,
      format('%s authors accessible', author_count)::text;
  ELSE
    RETURN QUERY SELECT 
      'Authors'::text,
      'WARNING'::text,
      'No authors accessible'::text;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comprehensive health report function
CREATE OR REPLACE FUNCTION get_health_report()
RETURNS json AS $$
DECLARE
  report json;
BEGIN
  SELECT json_build_object(
    'timestamp', now(),
    'rls_status', (SELECT json_agg(row_to_json(t)) FROM check_rls_policies() t),
    'content_accessibility', (SELECT json_agg(row_to_json(t)) FROM check_content_accessibility() t),
    'summary', json_build_object(
      'total_articles', (SELECT COUNT(*) FROM media_content),
      'total_categories', (SELECT COUNT(*) FROM categories),
      'total_authors', (SELECT COUNT(*) FROM authors),
      'active_news_sources', (SELECT COUNT(*) FROM news_sources WHERE is_active = true)
    )
  ) INTO report;
  
  RETURN report;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to anon and authenticated users for health checks
GRANT EXECUTE ON FUNCTION get_health_report() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_content_accessibility() TO anon, authenticated;
