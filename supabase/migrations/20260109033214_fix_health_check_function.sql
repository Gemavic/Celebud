/*
  # Fix Health Check Function

  1. Changes
    - Fix column name from polname to policyname in check_rls_policies function
  
  2. Purpose
    - Correct the health monitoring function to work properly
*/

DROP FUNCTION IF EXISTS check_rls_policies();

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
    COUNT(p.policyname) as policy_count,
    CASE 
      WHEN c.relrowsecurity = true AND COUNT(p.policyname) = 0 THEN 'CRITICAL: RLS enabled but no policies'
      WHEN c.relrowsecurity = true AND COUNT(p.policyname) > 0 THEN 'OK'
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
