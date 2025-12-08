/*
  # Fix Security and Performance Issues

  ## Overview
  Addresses critical security and performance issues identified by Supabase database advisors.

  ## 1. Performance Optimizations
    - Add missing index on messages.author_id to improve foreign key query performance
    - Update RLS policies to use `(select auth.uid())` pattern for better performance at scale
    - Fix function search paths to be immutable for security

  ## 2. RLS Policy Updates
    - Update all RLS policies on comments table to use optimized auth pattern
    - Update all RLS policies on media_content table to use optimized auth pattern
    - Update profiles policies to use optimized auth pattern

  ## 3. Function Security
    - Add immutable search_path to update_updated_at_column function
    - Add immutable search_path to messages_broadcast_trigger function (if exists)

  ## 4. Security Improvements
    - Ensure all auth checks are optimized and secure
*/

-- Add missing index for messages.author_id foreign key
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);

-- Drop and recreate comments policies with optimized auth pattern
DROP POLICY IF EXISTS "Authenticated users can view comments" ON comments;
CREATE POLICY "Authenticated users can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON comments;
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON comments;
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- Drop and recreate media_content policies with optimized auth pattern
DROP POLICY IF EXISTS "Admins can insert media content" ON media_content;
CREATE POLICY "Admins can insert media content"
  ON media_content FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (select auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update media content" ON media_content;
CREATE POLICY "Admins can update media content"
  ON media_content FOR UPDATE
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

-- Drop and recreate profiles policies with optimized auth pattern
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Fix function search paths for security
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix messages_broadcast_trigger function if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'messages_broadcast_trigger'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE FUNCTION messages_broadcast_trigger()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''''
      AS $func$
      BEGIN
        PERFORM pg_notify(
          ''messages'',
          json_build_object(
            ''room_id'', NEW.room_id,
            ''message_id'', NEW.id
          )::text
        );
        RETURN NEW;
      END;
      $func$;
    ';
  END IF;
END $$;