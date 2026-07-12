/*
  # Remove Gemavic Academy references

  Earlier migrations (20260626202200, 20260626211452, 20260626220750, 20260627035506)
  created a trigger, functions, and a table that hardcode calls to the Gemavic
  Academy Supabase project. Gemavic Academy is now a fully separate database and
  must never be reachable from Celebud.

  Sharing to Facebook/Telegram is handled entirely by the frontend calling
  Celebud's own "dynamic-worker" edge function directly. None of the objects
  removed here are used by the current app.
*/

drop trigger if exists trg_share_new_article on public.media_content;
drop function if exists public.notify_share_to_socials();

drop trigger if exists trg_share_request on public.share_requests;
drop function if exists public.trigger_share_request();
drop table if exists public.share_requests;

drop function if exists public.share_article_to_socials(uuid);
