-- ============================================================
-- SECURITY HARDENING: fix all flagged issues in one migration
-- ============================================================

-- ─── 1. Fix mutable search_path for functions that have null config ──────────
-- These 16 functions had no SET search_path, making them vulnerable to
-- search path injection attacks. Setting it explicitly locks the schema.

ALTER FUNCTION public.handle_new_user()
  SET search_path = public;

ALTER FUNCTION public.increment_article_views_with_meta(uuid, text, text)
  SET search_path = public;

ALTER FUNCTION public.get_ad_click_stats(integer)
  SET search_path = public;

ALTER FUNCTION public.get_recent_activity(integer)
  SET search_path = public;

ALTER FUNCTION public.get_hourly_views(integer)
  SET search_path = public;

ALTER FUNCTION public.get_top_referrers(integer)
  SET search_path = public;

ALTER FUNCTION public.update_creator_content_updated_at()
  SET search_path = public;

ALTER FUNCTION public.sync_admin_status_on_insert()
  SET search_path = public;

ALTER FUNCTION public.sync_admin_status_on_delete()
  SET search_path = public;

ALTER FUNCTION public.update_trending_featured_flags()
  SET search_path = public;

ALTER FUNCTION public.update_comments_count()
  SET search_path = public;

ALTER FUNCTION public.notify_share_to_socials()
  SET search_path = public;

ALTER FUNCTION public.trigger_share_request()
  SET search_path = public;

ALTER FUNCTION public.share_article_to_socials(uuid)
  SET search_path = public;

ALTER FUNCTION public.submit_creator_application(text, text, text, text, text[], text, text, text, text, text, text)
  SET search_path = public;

ALTER FUNCTION public.update_updated_at_column()
  SET search_path = public;


-- ─── 2. Revoke anon execute from all sensitive SECURITY DEFINER functions ────
-- These functions must not be callable by the unauthenticated (anon) role.

-- Trigger utility functions — only called by DB triggers, not users
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()      FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_creator_content_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_admin_status_on_insert()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_admin_status_on_delete()   FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_comments_count()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_share_to_socials()       FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_share_request()         FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_trending_featured_flags() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_archive_old_articles()     FROM anon;

-- Admin analytics functions — authenticated only (admin check is inside each function)
REVOKE EXECUTE ON FUNCTION public.get_ad_click_stats(integer)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_recent_activity(integer)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_hourly_views(integer)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_top_referrers(integer)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_total_views()               FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_category_views_breakdown()  FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_views(integer)        FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_secure_user_email(uuid)     FROM anon;

-- Share/creator functions — authenticated only
REVOKE EXECUTE ON FUNCTION public.share_article_to_socials(uuid)  FROM anon;
-- submit_creator_application already restricts to authenticated via auth.uid() check inside

-- Infrastructure functions — not user-callable
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()               FROM anon;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()               FROM authenticated;

-- LMS/admin-only management functions — revoke anon, these are admin operations
REVOKE EXECUTE ON FUNCTION public.add_admin_user(uuid, text)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.manage_admin_user(uuid, text, boolean)         FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, uuid, jsonb)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.activate_subscription(uuid, text, integer)     FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_student(uuid, text)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_student(uuid, text)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_student(uuid, text)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.extend_trial(uuid, integer)                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_restore_expired_suspensions()             FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_suspend_on_third_violation()              FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_suspension_expired(uuid)            FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_tutor_profile(uuid)                     FROM anon;
REVOKE EXECUTE ON FUNCTION public.manual_suspend_user(uuid, text)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.restore_suspended_user(uuid, uuid, text)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_certificate_number()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_course_certificate(uuid, uuid, text, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_grade_report(uuid, uuid)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_swot_analysis(uuid, uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_all_students_exam_summary()                FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_student_exam_history(uuid)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_violation_summary()                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.initialize_student_analytics(uuid)             FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin_or_tutor(uuid)                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_approved_tutor(uuid)                        FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_student_approved(uuid)                      FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_leaderboard_rankings()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_student_leaderboard(uuid)               FROM anon;

-- is_admin overloads — revoke anon (safe since anon is never admin)
REVOKE EXECUTE ON FUNCTION public.is_admin()          FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)      FROM anon;


-- ─── 3. Fix content_categories RLS "always true" policy ─────────────────────
-- The existing policy allowed any authenticated user unrestricted ALL access.
-- Replace with explicit admin check.

DROP POLICY IF EXISTS "admins_manage_content_categories" ON public.content_categories;

CREATE POLICY "admins_manage_content_categories" ON public.content_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );
