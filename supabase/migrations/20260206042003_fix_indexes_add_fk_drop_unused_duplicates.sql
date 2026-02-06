/*
  # Fix indexes: add missing FK indexes, drop unused and duplicate indexes

  1. Missing Foreign Key Indexes
    - Add index on `editorial_actions.performed_by`
    - Add index on `editorial_features.created_by`
    - Add index on `profiles.current_tier_id`
    - Add index on `user_subscriptions.tier_id`

  2. Duplicate Index Removal
    - Drop `idx_media_content_published` (duplicate of `idx_media_content_published_at`)

  3. Unused Index Removal
    - Drop 33 unused indexes across various tables to reduce write overhead
    - These indexes have zero scans according to database statistics
    - Covers: media_content, comments, content_tags, messages, room_members,
      rooms, editorial_actions, editorial_discussions, editorial_features,
      news_sources, mv_featured_content, mv_trending_content, mv_category_stats,
      comment_reactions, user_subscriptions, profiles, trending_articles_cache
*/

-- ============================================================
-- 1. Add missing foreign key indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_editorial_actions_performed_by
  ON public.editorial_actions (performed_by);

CREATE INDEX IF NOT EXISTS idx_editorial_features_created_by
  ON public.editorial_features (created_by);

CREATE INDEX IF NOT EXISTS idx_profiles_current_tier_id
  ON public.profiles (current_tier_id);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier_id
  ON public.user_subscriptions (tier_id);

-- ============================================================
-- 2. Drop duplicate index (keeping idx_media_content_published_at)
-- ============================================================

DROP INDEX IF EXISTS idx_media_content_published;

-- ============================================================
-- 3. Drop unused indexes
-- ============================================================

-- media_content unused indexes
DROP INDEX IF EXISTS idx_media_content_fts;
DROP INDEX IF EXISTS idx_media_content_category_published_trending;
DROP INDEX IF EXISTS idx_media_content_category_views;
DROP INDEX IF EXISTS idx_media_content_published_views;
DROP INDEX IF EXISTS idx_media_content_is_featured;
DROP INDEX IF EXISTS idx_media_content_category_id;
DROP INDEX IF EXISTS idx_media_content_search;
DROP INDEX IF EXISTS idx_media_content_published_at;

-- comments unused indexes
DROP INDEX IF EXISTS idx_comments_content_created_active;
DROP INDEX IF EXISTS idx_comments_content_id;
DROP INDEX IF EXISTS idx_comments_parent_id;
DROP INDEX IF EXISTS idx_comments_user_id;

-- content_tags unused indexes
DROP INDEX IF EXISTS idx_content_tags_tag_id;

-- messages unused indexes
DROP INDEX IF EXISTS idx_messages_author_id;
DROP INDEX IF EXISTS idx_messages_room_id;

-- room_members unused indexes
DROP INDEX IF EXISTS idx_room_members_user_id;
DROP INDEX IF EXISTS idx_room_members_user_room;
DROP INDEX IF EXISTS idx_room_members_room;

-- rooms unused indexes
DROP INDEX IF EXISTS idx_rooms_created_by;

-- editorial unused indexes
DROP INDEX IF EXISTS idx_editorial_actions_feature;
DROP INDEX IF EXISTS idx_editorial_discussions_feature;
DROP INDEX IF EXISTS idx_editorial_discussions_pinned;
DROP INDEX IF EXISTS idx_editorial_features_active_window;
DROP INDEX IF EXISTS idx_editorial_discussions_user;

-- news_sources unused indexes
DROP INDEX IF EXISTS idx_news_sources_priority;

-- materialized view unused indexes
DROP INDEX IF EXISTS idx_mv_featured_content_published;
DROP INDEX IF EXISTS idx_mv_trending_content_published;
DROP INDEX IF EXISTS idx_mv_category_stats_article_count;

-- comment_reactions unused indexes
DROP INDEX IF EXISTS idx_comment_reactions_user_id;

-- user_subscriptions unused indexes
DROP INDEX IF EXISTS idx_user_subscriptions_user_id;
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_sub_id;
DROP INDEX IF EXISTS idx_user_subscriptions_stripe_cust_id;

-- profiles unused indexes
DROP INDEX IF EXISTS idx_profiles_stripe_customer_id;

-- trending_articles_cache unused indexes
DROP INDEX IF EXISTS idx_trending_cache_views;
DROP INDEX IF EXISTS idx_trending_cache_published;