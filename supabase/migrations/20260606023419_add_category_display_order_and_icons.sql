
-- Add display_order column to categories for custom sorting
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 99;

-- Set display order according to user preferences
UPDATE categories SET display_order = 1 WHERE slug = 'news';
UPDATE categories SET display_order = 2 WHERE slug = 'politics';
UPDATE categories SET display_order = 3 WHERE slug = 'society';
UPDATE categories SET display_order = 4 WHERE slug = 'entertainment';
UPDATE categories SET display_order = 5 WHERE slug = 'interview';
UPDATE categories SET display_order = 6 WHERE slug = 'business';
UPDATE categories SET display_order = 7 WHERE slug = 'lifestyle';
UPDATE categories SET display_order = 8 WHERE slug = 'video';
UPDATE categories SET display_order = 9 WHERE slug = 'sports';
UPDATE categories SET display_order = 10 WHERE slug = 'technology';
UPDATE categories SET display_order = 11 WHERE slug = 'health';
UPDATE categories SET display_order = 12 WHERE slug = 'finance';
UPDATE categories SET display_order = 13 WHERE slug = 'education';
UPDATE categories SET display_order = 14 WHERE slug = 'immigration';
UPDATE categories SET display_order = 15 WHERE slug = 'security';
UPDATE categories SET display_order = 16 WHERE slug = 'legal';
UPDATE categories SET display_order = 17 WHERE slug = 'travel';
UPDATE categories SET display_order = 18 WHERE slug = 'celebrity';
UPDATE categories SET display_order = 19 WHERE slug = 'audio';

-- Update icons for better category representation
UPDATE categories SET icon = 'newspaper' WHERE slug = 'news';
UPDATE categories SET icon = 'landmark' WHERE slug = 'politics';
UPDATE categories SET icon = 'users' WHERE slug = 'society';
UPDATE categories SET icon = 'film' WHERE slug = 'entertainment';
UPDATE categories SET icon = 'mic' WHERE slug = 'interview';
UPDATE categories SET icon = 'briefcase' WHERE slug = 'business';
UPDATE categories SET icon = 'heart' WHERE slug = 'lifestyle';
UPDATE categories SET icon = 'video' WHERE slug = 'video';
UPDATE categories SET icon = 'trophy' WHERE slug = 'sports';
UPDATE categories SET icon = 'cpu' WHERE slug = 'technology';
UPDATE categories SET icon = 'activity' WHERE slug = 'health';
UPDATE categories SET icon = 'trending-up' WHERE slug = 'finance';
UPDATE categories SET icon = 'graduation-cap' WHERE slug = 'education';
UPDATE categories SET icon = 'globe' WHERE slug = 'immigration';
UPDATE categories SET icon = 'shield' WHERE slug = 'security';
UPDATE categories SET icon = 'scale' WHERE slug = 'legal';
UPDATE categories SET icon = 'plane' WHERE slug = 'travel';
UPDATE categories SET icon = 'star' WHERE slug = 'celebrity';
UPDATE categories SET icon = 'headphones' WHERE slug = 'audio';

-- Update colors for visual distinction
UPDATE categories SET color = '#DC2626' WHERE slug = 'news';
UPDATE categories SET color = '#1D4ED8' WHERE slug = 'politics';
UPDATE categories SET color = '#059669' WHERE slug = 'society';
UPDATE categories SET color = '#D97706' WHERE slug = 'entertainment';
UPDATE categories SET color = '#7C3AED' WHERE slug = 'interview';
UPDATE categories SET color = '#0F766E' WHERE slug = 'business';
UPDATE categories SET color = '#EC4899' WHERE slug = 'lifestyle';
UPDATE categories SET color = '#E11D48' WHERE slug = 'video';
UPDATE categories SET color = '#16A34A' WHERE slug = 'sports';
UPDATE categories SET color = '#2563EB' WHERE slug = 'technology';
UPDATE categories SET color = '#10B981' WHERE slug = 'health';
UPDATE categories SET color = '#F59E0B' WHERE slug = 'finance';
UPDATE categories SET color = '#6366F1' WHERE slug = 'education';
UPDATE categories SET color = '#0891B2' WHERE slug = 'immigration';
UPDATE categories SET color = '#991B1B' WHERE slug = 'security';
UPDATE categories SET color = '#4338CA' WHERE slug = 'legal';
UPDATE categories SET color = '#0EA5E9' WHERE slug = 'travel';
UPDATE categories SET color = '#F97316' WHERE slug = 'celebrity';
UPDATE categories SET color = '#8B5CF6' WHERE slug = 'audio';
