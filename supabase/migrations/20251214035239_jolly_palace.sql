/*
  # Editorial Content Management System

  ## Overview
  Adds editorial content management with time-based display, discussion features, and admin controls.

  ## 1. New Tables
    - `editorial_features`
      - `id` (uuid, primary key)
      - `content_id` (uuid, foreign key to media_content)
      - `title` (text) - Custom editorial title
      - `editorial_description` (text) - Editorial context/introduction
      - `feature_type` (text) - "breaking", "trending", "discussion", "interview_spotlight"
      - `priority` (integer) - Display priority (1 = highest)
      - `is_active` (boolean)
      - `start_date` (timestamptz) - When to start featuring
      - `end_date` (timestamptz) - When to stop featuring
      - `discussion_enabled` (boolean)
      - `call_to_action` (text) - Custom CTA text
      - `engagement_goal` (text) - What kind of engagement is sought
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `editorial_actions`
      - `id` (uuid, primary key)
      - `feature_id` (uuid, foreign key to editorial_features)
      - `action_type` (text) - "created", "extended", "reposted", "archived", "discussion_opened", "discussion_closed"
      - `action_description` (text)
      - `performed_by` (uuid, foreign key to auth.users)
      - `performed_at` (timestamptz)
      - `metadata` (jsonb) - Additional action data

    - `editorial_discussions`
      - `id` (uuid, primary key)
      - `feature_id` (uuid, foreign key to editorial_features)
      - `user_id` (uuid, foreign key to auth.users)
      - `message` (text)
      - `is_pinned` (boolean) - For highlighting important discussions
      - `created_at` (timestamptz)

  ## 2. Updates to Existing Tables
    - Add `editorial_notes` to media_content for internal editorial notes
    - Add `last_featured_at` to media_content for tracking reposting

  ## 3. Security
    - Enable RLS on all tables
    - Add policies for admin access and public viewing
    - Discussion policies for authenticated users

  ## 4. Functions
    - Function to automatically archive expired editorial features
    - Function to get active editorial features by priority
*/

-- Create editorial_features table
CREATE TABLE IF NOT EXISTS editorial_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES media_content(id) ON DELETE CASCADE,
  title text,
  editorial_description text,
  feature_type text DEFAULT 'trending' CHECK (feature_type IN ('breaking', 'trending', 'discussion', 'interview_spotlight', 'hot_topic')),
  priority integer DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  discussion_enabled boolean DEFAULT true,
  call_to_action text DEFAULT 'Join the discussion',
  engagement_goal text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

-- Create editorial_actions table for audit trail
CREATE TABLE IF NOT EXISTS editorial_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES editorial_features(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('created', 'extended', 'reposted', 'archived', 'discussion_opened', 'discussion_closed', 'priority_changed')),
  action_description text,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create editorial_discussions table
CREATE TABLE IF NOT EXISTS editorial_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id uuid NOT NULL REFERENCES editorial_features(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL CHECK (char_length(message) >= 1 AND char_length(message) <= 2000),
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add columns to media_content for editorial management
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'editorial_notes'
  ) THEN
    ALTER TABLE media_content ADD COLUMN editorial_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_content' AND column_name = 'last_featured_at'
  ) THEN
    ALTER TABLE media_content ADD COLUMN last_featured_at timestamptz;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE editorial_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_discussions ENABLE ROW LEVEL SECURITY;

-- Policies for editorial_features
CREATE POLICY "Anyone can view active editorial features"
  ON editorial_features FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (end_date IS NULL OR end_date > now()));

CREATE POLICY "Admins can manage editorial features"
  ON editorial_features FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- Policies for editorial_actions
CREATE POLICY "Admins can view editorial actions"
  ON editorial_actions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can insert editorial actions"
  ON editorial_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- Policies for editorial_discussions
CREATE POLICY "Anyone can view editorial discussions"
  ON editorial_discussions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can create discussions"
  ON editorial_discussions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own discussions"
  ON editorial_discussions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins can manage all discussions"
  ON editorial_discussions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_editorial_features_active ON editorial_features(is_active, priority, start_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_editorial_features_content ON editorial_features(content_id);
CREATE INDEX IF NOT EXISTS idx_editorial_features_dates ON editorial_features(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_editorial_actions_feature ON editorial_actions(feature_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_discussions_feature ON editorial_discussions(feature_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_editorial_discussions_pinned ON editorial_discussions(feature_id, is_pinned, created_at DESC) WHERE is_pinned = true;

-- Function to get active editorial features
CREATE OR REPLACE FUNCTION get_active_editorial_features()
RETURNS TABLE (
  feature_id uuid,
  content_id uuid,
  title text,
  editorial_description text,
  feature_type text,
  priority integer,
  call_to_action text,
  discussion_enabled boolean,
  discussion_count bigint,
  days_remaining integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ef.id as feature_id,
    ef.content_id,
    ef.title,
    ef.editorial_description,
    ef.feature_type,
    ef.priority,
    ef.call_to_action,
    ef.discussion_enabled,
    COUNT(ed.id) as discussion_count,
    CASE 
      WHEN ef.end_date IS NULL THEN NULL
      ELSE EXTRACT(day FROM ef.end_date - now())::integer
    END as days_remaining
  FROM editorial_features ef
  LEFT JOIN editorial_discussions ed ON ef.id = ed.feature_id
  WHERE ef.is_active = true 
    AND ef.start_date <= now()
    AND (ef.end_date IS NULL OR ef.end_date > now())
  GROUP BY ef.id, ef.content_id, ef.title, ef.editorial_description, ef.feature_type, ef.priority, ef.call_to_action, ef.discussion_enabled, ef.end_date
  ORDER BY ef.priority ASC, ef.created_at DESC;
END;
$$;

-- Function to automatically archive expired features
CREATE OR REPLACE FUNCTION archive_expired_editorial_features()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  archived_count integer := 0;
BEGIN
  -- Archive expired features
  UPDATE editorial_features 
  SET is_active = false, updated_at = now()
  WHERE is_active = true 
    AND end_date IS NOT NULL 
    AND end_date <= now();
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Log the archive action
  INSERT INTO editorial_actions (feature_id, action_type, action_description, performed_by, metadata)
  SELECT 
    id,
    'archived',
    'Automatically archived due to expiration',
    NULL,
    jsonb_build_object('auto_archived', true, 'expired_at', now())
  FROM editorial_features 
  WHERE is_active = false 
    AND end_date IS NOT NULL 
    AND end_date <= now()
    AND updated_at >= now() - interval '1 minute';
  
  RETURN archived_count;
END;
$$;

-- Function to extend editorial feature duration
CREATE OR REPLACE FUNCTION extend_editorial_feature(
  feature_id_param uuid,
  additional_days integer,
  reason text DEFAULT 'Editorial decision'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_end_date timestamptz;
  new_end_date timestamptz;
BEGIN
  -- Get current end date
  SELECT end_date INTO current_end_date
  FROM editorial_features
  WHERE id = feature_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Calculate new end date
  new_end_date := COALESCE(current_end_date, now()) + (additional_days || ' days')::interval;
  
  -- Update the feature
  UPDATE editorial_features
  SET end_date = new_end_date, updated_at = now()
  WHERE id = feature_id_param;
  
  -- Log the action
  INSERT INTO editorial_actions (feature_id, action_type, action_description, performed_by, metadata)
  VALUES (
    feature_id_param,
    'extended',
    reason,
    (select auth.uid()),
    jsonb_build_object(
      'previous_end_date', current_end_date,
      'new_end_date', new_end_date,
      'additional_days', additional_days
    )
  );
  
  RETURN true;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_editorial_features_updated_at
  BEFORE UPDATE ON editorial_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_editorial_discussions_updated_at
  BEFORE UPDATE ON editorial_discussions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample editorial feature types documentation
COMMENT ON TABLE editorial_features IS 'Manages time-based featured content with discussion capabilities';
COMMENT ON COLUMN editorial_features.feature_type IS 'Types: breaking (urgent news), trending (popular content), discussion (debate topics), interview_spotlight (featured interviews), hot_topic (controversial/engaging content)';
COMMENT ON COLUMN editorial_features.priority IS 'Display priority: 1 = highest priority, 10 = lowest priority';
COMMENT ON COLUMN editorial_features.engagement_goal IS 'Describes the desired audience engagement (e.g., "Generate discussion about immigration policy", "Promote upcoming interview")';