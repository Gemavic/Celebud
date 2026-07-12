/*
  # Restore public read on profiles.is_admin

  The previous migration (20260712130000) restricted profiles columns to
  anon/authenticated to stop Stripe fields leaking. This broke a wide set
  of RLS policies across editorial_features, editorial_discussions,
  editorial_actions, media_content, creator_applications, and
  reporter_applications that do an inline
  "EXISTS (SELECT 1 FROM profiles WHERE ... is_admin = true)" check rather
  than calling the safe is_admin() function — Postgres requires SELECT
  privilege on a column just to evaluate it in a policy expression, even
  for non-matching rows, regardless of the actual boolean result.

  Rewriting every one of those policies to use is_admin() instead is a
  larger, riskier change to make live. Restoring public read on is_admin
  alone (not the Stripe columns, which no policy references) fixes all of
  them at once and matches the column's original visibility.
*/

grant select (is_admin) on public.profiles to anon, authenticated;
