
-- Grant admin/reporter access to all confirmed reporters who are missing it.
-- These are the Celebud Media reporters who need write access to the editorial dashboard.

-- Step 1: Set is_admin = true on profiles for all reporters
UPDATE profiles
SET is_admin = true
WHERE id IN (
  '04e986de-79dd-420e-bc7a-853af39488f8',  -- ayanfedscientist@gmail.com
  '886e2204-7ed7-4afd-81b7-faad1527cc7b',  -- musbaudeenmalik83@gmail.com
  '79ab815a-e5b2-4ef3-ad7e-22fb48292e02',  -- olatunbosunadewale1@gmail.com
  '13d9008d-d045-4a47-b068-66283269f9b3',  -- samuelayorinde577@gmail.com
  'f4497471-b3da-4eb1-b229-8c56d535d4ff',  -- timothymobolaji@gmail.com
  '0917fa77-0450-472c-bc65-68ad9f3f7f62',  -- gayusprosper23@gmail.com
  '08e1e5ba-dcd6-443e-bd61-6038a8ffcedb'   -- fisayoopaleye32@gmail.com
)
AND is_admin = false;

-- Step 2: Add them to admin_users (insert only if not already present)
INSERT INTO admin_users (user_id)
SELECT unnest(ARRAY[
  '04e986de-79dd-420e-bc7a-853af39488f8'::uuid,
  '886e2204-7ed7-4afd-81b7-faad1527cc7b'::uuid,
  '79ab815a-e5b2-4ef3-ad7e-22fb48292e02'::uuid,
  '13d9008d-d045-4a47-b068-66283269f9b3'::uuid,
  'f4497471-b3da-4eb1-b229-8c56d535d4ff'::uuid,
  '0917fa77-0450-472c-bc65-68ad9f3f7f62'::uuid,
  '08e1e5ba-dcd6-443e-bd61-6038a8ffcedb'::uuid
])
ON CONFLICT (user_id) DO NOTHING;
