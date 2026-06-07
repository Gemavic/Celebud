-- Function to get total views across all articles
CREATE OR REPLACE FUNCTION get_total_views()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(views_count), 0)::bigint FROM media_content;
$$;

GRANT EXECUTE ON FUNCTION get_total_views() TO anon, authenticated;

-- Function to get daily views for last N days
CREATE OR REPLACE FUNCTION get_daily_views(days_back integer DEFAULT 14)
RETURNS TABLE(date text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    to_char(d.day, 'YYYY-MM-DD') as date,
    COALESCE(COUNT(ve.id), 0)::bigint as count
  FROM generate_series(
    (CURRENT_DATE - (days_back || ' days')::interval)::date,
    CURRENT_DATE,
    '1 day'::interval
  ) AS d(day)
  LEFT JOIN view_events ve ON DATE(ve.viewed_at) = d.day::date
  GROUP BY d.day
  ORDER BY d.day;
$$;

GRANT EXECUTE ON FUNCTION get_daily_views(integer) TO anon, authenticated;

-- Function to get views breakdown by category
CREATE OR REPLACE FUNCTION get_category_views_breakdown()
RETURNS TABLE(name text, color text, views bigint, articles bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.name,
    c.color,
    COALESCE(SUM(mc.views_count), 0)::bigint as views,
    COUNT(mc.id)::bigint as articles
  FROM categories c
  INNER JOIN media_content mc ON mc.category_id = c.id
  WHERE c.display_order > 0
  GROUP BY c.name, c.color, c.display_order
  HAVING COUNT(mc.id) > 0
  ORDER BY COALESCE(SUM(mc.views_count), 0) DESC;
$$;

GRANT EXECUTE ON FUNCTION get_category_views_breakdown() TO anon, authenticated;
