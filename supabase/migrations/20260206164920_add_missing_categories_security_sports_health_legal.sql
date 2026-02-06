/*
  # Add Missing Categories

  1. New Categories
    - `Security` - For crime, terrorism, violence, and security-related news
    - `Sports` - For sports, athletics, and competition news
    - `Health` - For health, medical, and wellness news
    - `Legal` - For court cases, litigation, law, and judicial news

  2. Details
    - Each category gets a unique color and icon
    - Uses IF NOT EXISTS pattern to avoid duplicates
*/

INSERT INTO categories (name, slug, icon, color)
SELECT 'Security', 'security', 'shield-alert', '#DC2626'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'security');

INSERT INTO categories (name, slug, icon, color)
SELECT 'Sports', 'sports', 'trophy', '#059669'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'sports');

INSERT INTO categories (name, slug, icon, color)
SELECT 'Health', 'health', 'heart-pulse', '#0891B2'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'health');

INSERT INTO categories (name, slug, icon, color)
SELECT 'Legal', 'legal', 'scale', '#92400E'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE slug = 'legal');
