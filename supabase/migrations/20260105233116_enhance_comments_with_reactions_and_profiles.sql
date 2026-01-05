/*
  # Enhanced Comments System with Reactions and User Profiles

  1. New Tables
    - `comment_reactions` - Stores emoji reactions to comments
      - `id` (uuid, primary key)
      - `comment_id` (uuid, references comments)
      - `user_id` (uuid, references auth.users)
      - `emoji` (text) - The emoji reaction
      - `created_at` (timestamp)

  2. Changes
    - Add indexes for better performance
    - Add aggregation function for reaction counts

  3. Security
    - Enable RLS on comment_reactions table
    - Users can add/remove their own reactions
    - Everyone can view reactions
*/

CREATE TABLE IF NOT EXISTS comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);

ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comment reactions"
  ON comment_reactions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Users can add their own reactions"
  ON comment_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
  ON comment_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION get_comment_reactions(p_comment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reactions_json json;
BEGIN
  SELECT json_object_agg(emoji, count)
  INTO reactions_json
  FROM (
    SELECT emoji, COUNT(*)::int as count
    FROM comment_reactions
    WHERE comment_id = p_comment_id
    GROUP BY emoji
  ) subquery;
  
  RETURN COALESCE(reactions_json, '{}'::json);
END;
$$;