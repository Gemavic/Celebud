/*
  # Update Author from Sarah Johnson to Matthew Ayandare

  ## Overview
  Updates the author "Sarah Johnson" to "Matthew Ayandare" with new profile photo.

  ## Changes
    1. Update author name from "Sarah Johnson" to "Matthew Ayandare"
    2. Update avatar_url to point to the new photo: /g.m2.jpeg
    3. Update bio to reflect the new author's background
    
  ## Impact
    - All media content previously authored by Sarah Johnson will now show Matthew Ayandare
    - The new profile photo will be displayed across all content categories
*/

-- Update the author record
UPDATE authors 
SET 
  name = 'Matthew Ayandare',
  avatar_url = '/g.m2.jpeg',
  bio = 'Entertainment journalist and media professional with extensive experience covering celebrity news and cultural trends.'
WHERE name = 'Sarah Johnson';