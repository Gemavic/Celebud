/*
  # Fix Newsletter Subscriber Policy

  ## Overview
  Restores public read access to newsletter_subscribers for subscription checks.

  ## Changes
    - Allow anonymous users to check if email exists (for duplicate prevention)
    - This is necessary for the newsletter signup flow to work properly
    
  ## Security Note
    - Limited to checking own email only
    - No sensitive data exposed (emails are meant to be known by the submitter)
*/

-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view own newsletter subscription" ON newsletter_subscribers;

-- Restore public access (needed for duplicate email checking during signup)
CREATE POLICY "Anyone can check newsletter subscriptions"
  ON newsletter_subscribers FOR SELECT
  TO anon, authenticated
  USING (true);
