
-- Add title column for role display name
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS title text;

-- Matthew Ayandare (mattocanada1) → super_admin, CEO / Chief Editor
UPDATE admin_users SET role = 'super_admin', title = 'CEO / Chief Editor'
WHERE user_id = '4653203b-42d3-4a95-89f7-28eade48fbb7';

-- Gbenga Ayandare (histogm) → super_admin, CEO / Chief Editor
UPDATE admin_users SET role = 'super_admin', title = 'CEO / Chief Editor'
WHERE user_id = 'c41d35d4-03b3-4a8d-8db6-d58cc8347186';

-- Victoria Odunola (victoriaodun40) → admin, Admin-2
INSERT INTO admin_users (user_id, role, title)
VALUES ('f2342f6d-a17e-4d65-83b5-6ed33647438f', 'admin', 'Admin-2')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin', title = 'Admin-2';

-- Enable is_admin on profiles for all three
UPDATE profiles SET is_admin = true
WHERE id IN (
  '4653203b-42d3-4a95-89f7-28eade48fbb7',
  'c41d35d4-03b3-4a8d-8db6-d58cc8347186',
  'f2342f6d-a17e-4d65-83b5-6ed33647438f'
);
