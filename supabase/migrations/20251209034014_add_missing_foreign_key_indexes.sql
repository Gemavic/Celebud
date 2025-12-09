/*
  # Add Missing Foreign Key Indexes

  ## Overview
  Adds covering indexes for all foreign keys to improve query performance and resolve security warnings.

  ## Performance Impact
  These indexes will significantly improve:
  - Join operations between related tables
  - Filtering by foreign key columns
  - Foreign key constraint validation
  - Overall query response times

  ## Indexes Added
  
  ### Ad Impressions
    - `idx_ad_impressions_ad_id` on ad_impressions(ad_id)
  
  ### Comments
    - `idx_comments_content_id` on comments(content_id)
    - `idx_comments_parent_id` on comments(parent_id)
    - `idx_comments_user_id` on comments(user_id)
  
  ### Content Tags
    - `idx_content_tags_tag_id` on content_tags(tag_id)
  
  ### Media Content
    - `idx_media_content_author_id` on media_content(author_id)
  
  ### Messages
    - `idx_messages_author_id` on messages(author_id)
    - `idx_messages_room_id` on messages(room_id)
  
  ### News Fetch Log
    - `idx_news_fetch_log_source_id` on news_fetch_log(source_id)
  
  ### Room Members
    - `idx_room_members_user_id` on room_members(user_id)
  
  ### Rooms
    - `idx_rooms_created_by` on rooms(created_by)

  ## Notes
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - Indexes are non-unique since foreign keys can have multiple references
    - These indexes support both query performance and referential integrity checks
*/

-- Ad Impressions
CREATE INDEX IF NOT EXISTS idx_ad_impressions_ad_id 
  ON ad_impressions(ad_id);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_content_id 
  ON comments(content_id);

CREATE INDEX IF NOT EXISTS idx_comments_parent_id 
  ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id 
  ON comments(user_id);

-- Content Tags
CREATE INDEX IF NOT EXISTS idx_content_tags_tag_id 
  ON content_tags(tag_id);

-- Media Content
CREATE INDEX IF NOT EXISTS idx_media_content_author_id 
  ON media_content(author_id);

-- Messages
CREATE INDEX IF NOT EXISTS idx_messages_author_id 
  ON messages(author_id);

CREATE INDEX IF NOT EXISTS idx_messages_room_id 
  ON messages(room_id);

-- News Fetch Log
CREATE INDEX IF NOT EXISTS idx_news_fetch_log_source_id 
  ON news_fetch_log(source_id);

-- Room Members
CREATE INDEX IF NOT EXISTS idx_room_members_user_id 
  ON room_members(user_id);

-- Rooms
CREATE INDEX IF NOT EXISTS idx_rooms_created_by 
  ON rooms(created_by);
