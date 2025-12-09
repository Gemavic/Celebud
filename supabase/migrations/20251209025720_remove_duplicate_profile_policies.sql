/*
  # Remove Duplicate Profile Policies

  ## Overview
  Removes duplicate SELECT policy on profiles table to resolve "Multiple Permissive Policies" warning.

  ## Changes
    - Drop the old "read profiles" policy (duplicate)
    - Keep the clearer "Users can view all profiles" policy
    
  ## Security Impact
    - No security changes, just removing redundancy
    - Authenticated users can still view all profiles as before
*/

-- Drop the duplicate policy
DROP POLICY IF EXISTS "read profiles" ON profiles;
