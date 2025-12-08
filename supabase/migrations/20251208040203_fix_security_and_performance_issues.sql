/*
  # Fix Security and Performance Issues

  ## Overview
  Fixes critical security and performance issues identified by Supabase database advisors.

  ## 1. Add Missing Indexes
    - Add index on messages.author_id for better foreign key performance

  ## 2. Optimize RLS Policies
    - Update all RLS policies to use `(select auth.uid())` instead of `auth.uid()`
    - This prevents re-evaluation of auth functions for each row, improving performance at scale
    - Affects policies on: comments, media_content, profiles

  ## 3. Fix Function Security
    - Set explicit search_path for functions to prevent search_path hijacking
    - Affects: update_updated_at_column, messages_broadcast_trigger

  ## 4. Security Improvements
    - Ensure proper security context for all functions
*/

-- Add missing index for messages.author_id
CREATE INDEX IF NOT EXISTS idx_messages_author_id ON messages(author_id);

-- Drop and recreate comments RLS policies with optimized auth checks
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

-- Drop and recreate media_content RLS policies with optimized auth checks
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

-- Drop and recreate profiles RLS policies with optimized auth checks
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

-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      SET search_path = public
      AS $func$
      BEGIN
        PERFORM pg_notify(
          ''room_'' || NEW.room_id::text,
          json_build_object(
            ''type'', TG_OP,
            ''record'', row_to_json(NEW)
          )::text
        );
        RETURN NEW;
      END;
      $func$;
    ';
  END IF;
END $$;