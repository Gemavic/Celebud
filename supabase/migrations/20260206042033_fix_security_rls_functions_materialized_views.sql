/*
  # Fix security: RLS policies, function search paths, materialized views, permissive policies

  1. RLS Auth Function Optimization
    - Replace `auth.uid()` with `(select auth.uid())` in 5 policies to prevent
      per-row re-evaluation (user_subscriptions, comment_reactions, media_content)

  2. Always-True RLS Policy Fixes
    - `ad_impressions`: Add timestamp validation for anonymous inserts
    - `newsletter_subscribers`: Add email format validation for anonymous inserts
    - `user_subscriptions`: Replace overly permissive authenticated INSERT/UPDATE
      policies with ownership-based checks

  3. Multiple Permissive Policies Fix
    - `editorial_discussions`: Replace overlapping ALL + per-operation policies
      with consolidated per-operation policies

  4. Function Search Path Security
    - Set `search_path = 'public'` on 16 functions to prevent search path injection

  5. Materialized View API Exposure
    - Revoke excessive permissions on 4 materialized views
    - Grant only SELECT access to anon and authenticated roles
*/

-- ============================================================
-- 1. Fix RLS policies to use (select auth.uid()) pattern
-- ============================================================

-- user_subscriptions: "Users can view own subscriptions"
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- comment_reactions: "Users can add their own reactions"
DROP POLICY IF EXISTS "Users can add their own reactions" ON public.comment_reactions;
CREATE POLICY "Users can add their own reactions"
  ON public.comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- comment_reactions: "Users can delete their own reactions"
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.comment_reactions;
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- media_content: "Admins can insert media content"
DROP POLICY IF EXISTS "Admins can insert media content" ON public.media_content;
CREATE POLICY "Admins can insert media content"
  ON public.media_content FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

-- media_content: "Admins can update media content"
DROP POLICY IF EXISTS "Admins can update media content" ON public.media_content;
CREATE POLICY "Admins can update media content"
  ON public.media_content FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
  ));

-- ============================================================
-- 2. Fix always-true RLS policies
-- ============================================================

-- ad_impressions: restrict anonymous inserts with timestamp validation
DROP POLICY IF EXISTS "Anyone can record ad impressions" ON public.ad_impressions;
CREATE POLICY "Anyone can record ad impressions"
  ON public.ad_impressions FOR INSERT
  TO anon
  WITH CHECK (created_at >= now() - interval '1 minute');

-- newsletter_subscribers: restrict with email validation
DROP POLICY IF EXISTS "Anyone can subscribe to newsletter" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can subscribe to newsletter"
  ON public.newsletter_subscribers FOR INSERT
  TO anon
  WITH CHECK (
    email IS NOT NULL
    AND length(email) >= 5
    AND position('@' in email) > 1
  );

-- user_subscriptions: replace overly permissive policies with ownership checks
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can insert own subscriptions"
  ON public.user_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role can update subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON public.user_subscriptions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ============================================================
-- 3. Fix multiple permissive policies on editorial_discussions
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage all discussions" ON public.editorial_discussions;
DROP POLICY IF EXISTS "Authenticated users can create discussions" ON public.editorial_discussions;
DROP POLICY IF EXISTS "Public read active feature discussions" ON public.editorial_discussions;
DROP POLICY IF EXISTS "Users can update own discussions" ON public.editorial_discussions;

CREATE POLICY "Read active discussions or admin"
  ON public.editorial_discussions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.editorial_features ef
      WHERE ef.id = editorial_discussions.feature_id
      AND ef.is_active = true
      AND ef.start_date <= now()
      AND (ef.end_date IS NULL OR ef.end_date > now())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
    )
  );

CREATE POLICY "Create own discussions or admin"
  ON public.editorial_discussions FOR INSERT
  TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
    )
  );

CREATE POLICY "Update own discussions or admin"
  ON public.editorial_discussions FOR UPDATE
  TO authenticated
  USING (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    (select auth.uid()) = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can delete discussions"
  ON public.editorial_discussions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (select auth.uid()) AND profiles.is_admin = true
    )
  );

-- ============================================================
-- 4. Fix function search paths
-- ============================================================

ALTER FUNCTION public.auth_is_anonymous() SET search_path = 'public';
ALTER FUNCTION public.update_comments_count() SET search_path = 'public';
ALTER FUNCTION public.auto_curate_featured_content() SET search_path = 'public';
ALTER FUNCTION public.auto_curate_trending_content() SET search_path = 'public';
ALTER FUNCTION public.run_auto_curation() SET search_path = 'public';
ALTER FUNCTION public.update_updated_at_column() SET search_path = 'public';
ALTER FUNCTION public.refresh_materialized_views() SET search_path = 'public';
ALTER FUNCTION public.get_comment_reactions(uuid) SET search_path = 'public';
ALTER FUNCTION public.create_monthly_partitions() SET search_path = 'public';
ALTER FUNCTION public.get_partition_stats() SET search_path = 'public';
ALTER FUNCTION public.get_health_report() SET search_path = 'public';
ALTER FUNCTION public.calculate_trending_score(timestamptz, integer, integer, text, text) SET search_path = 'public';
ALTER FUNCTION public.update_trending_featured_flags() SET search_path = 'public';
ALTER FUNCTION public.check_content_accessibility() SET search_path = 'public';
ALTER FUNCTION public.check_rls_policies() SET search_path = 'public';
ALTER FUNCTION public.media_content_keys_sync() SET search_path = 'public';

-- ============================================================
-- 5. Fix materialized view API exposure
-- ============================================================

REVOKE ALL ON public.mv_featured_content FROM anon, authenticated;
GRANT SELECT ON public.mv_featured_content TO anon, authenticated;

REVOKE ALL ON public.mv_trending_content FROM anon, authenticated;
GRANT SELECT ON public.mv_trending_content TO anon, authenticated;

REVOKE ALL ON public.mv_category_stats FROM anon, authenticated;
GRANT SELECT ON public.mv_category_stats TO anon, authenticated;

REVOKE ALL ON public.trending_articles_cache FROM anon, authenticated;
GRANT SELECT ON public.trending_articles_cache TO anon, authenticated;