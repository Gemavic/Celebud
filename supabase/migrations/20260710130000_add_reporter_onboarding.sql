-- Reporter onboarding system
--
-- Reporters apply at /reporters/apply; the CEO/Editor reviews at
-- /admin/reporters and approves or rejects with a comment. Admins can
-- also register a reporter manually by name + email; if that email has
-- no account yet, the reporter is linked automatically the moment they
-- sign up and apply with the same email.
--
-- Approval does three things in one step: creates (or reuses) the
-- byline in `authors`, links the login account to it, and grants the
-- same reporter/admin access as the existing reporters.

CREATE TABLE IF NOT EXISTS reporter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone_number text,
  bio text,
  coverage_areas text,
  portfolio_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_comment text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  author_id uuid REFERENCES authors(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reporter_applications_status ON reporter_applications(status);
CREATE INDEX IF NOT EXISTS idx_reporter_applications_user ON reporter_applications(user_id);

ALTER TABLE reporter_applications ENABLE ROW LEVEL SECURITY;

-- Applicants may see their own application (status + review comment)
CREATE POLICY "Applicants view own application"
  ON reporter_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Admins may see all applications
CREATE POLICY "Admins view all applications"
  ON reporter_applications FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- All writes go through the SECURITY DEFINER functions below; no
-- INSERT/UPDATE policies on purpose.

-- Reporter self-signup ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_reporter_application(
  p_full_name     text,
  p_email         text,
  p_phone_number  text DEFAULT NULL,
  p_bio           text DEFAULT NULL,
  p_coverage      text DEFAULT NULL,
  p_portfolio_url text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing reporter_applications%ROWTYPE;
  v_prereg reporter_applications%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF trim(coalesce(p_full_name, '')) = '' OR trim(coalesce(p_email, '')) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Name and email are required');
  END IF;

  -- If an admin pre-registered this email, link the new account to it
  SELECT * INTO v_prereg FROM reporter_applications
  WHERE user_id IS NULL
    AND lower(email) = lower(trim(p_email))
    AND status = 'approved'
  LIMIT 1;

  IF v_prereg.id IS NOT NULL THEN
    UPDATE reporter_applications SET user_id = v_user_id WHERE id = v_prereg.id;
    IF v_prereg.author_id IS NOT NULL THEN
      UPDATE authors SET user_id = v_user_id WHERE id = v_prereg.author_id;
    END IF;
    UPDATE profiles SET is_admin = true WHERE id = v_user_id;
    INSERT INTO admin_users (user_id) VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN json_build_object('success', true, 'linked', true);
  END IF;

  SELECT * INTO v_existing FROM reporter_applications
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    -- A rejected applicant may re-apply; this resets their application
    IF v_existing.status = 'rejected' THEN
      UPDATE reporter_applications SET
        full_name      = trim(p_full_name),
        email          = trim(p_email),
        phone_number   = nullif(trim(coalesce(p_phone_number, '')), ''),
        bio            = nullif(trim(coalesce(p_bio, '')), ''),
        coverage_areas = nullif(trim(coalesce(p_coverage, '')), ''),
        portfolio_url  = nullif(trim(coalesce(p_portfolio_url, '')), ''),
        status         = 'pending',
        review_comment = NULL,
        reviewed_by    = NULL,
        reviewed_at    = NULL,
        created_at     = now()
      WHERE id = v_existing.id;
      RETURN json_build_object('success', true, 'reapplied', true);
    END IF;
    RETURN json_build_object('success', false, 'error', 'duplicate');
  END IF;

  INSERT INTO reporter_applications (
    user_id, full_name, email, phone_number, bio, coverage_areas, portfolio_url, status
  ) VALUES (
    v_user_id,
    trim(p_full_name),
    trim(p_email),
    nullif(trim(coalesce(p_phone_number, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
    nullif(trim(coalesce(p_coverage, '')), ''),
    nullif(trim(coalesce(p_portfolio_url, '')), ''),
    'pending'
  );

  RETURN json_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_reporter_application(text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_reporter_application(text,text,text,text,text,text) TO authenticated;

-- CEO/Editor review: approve or reject with a comment ---------------------
CREATE OR REPLACE FUNCTION public.review_reporter_application(
  p_application_id uuid,
  p_approve        boolean,
  p_comment        text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_app reporter_applications%ROWTYPE;
  v_author_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    UNION
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT * INTO v_app FROM reporter_applications WHERE id = p_application_id;
  IF v_app.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Application not found');
  END IF;

  IF NOT p_approve THEN
    UPDATE reporter_applications SET
      status         = 'rejected',
      review_comment = nullif(trim(coalesce(p_comment, '')), ''),
      reviewed_by    = auth.uid(),
      reviewed_at    = now()
    WHERE id = p_application_id;
    RETURN json_build_object('success', true, 'status', 'rejected');
  END IF;

  -- Approve: reuse an existing byline with the same name, or create one
  v_author_id := v_app.author_id;
  IF v_author_id IS NULL THEN
    SELECT id INTO v_author_id FROM authors
    WHERE lower(name) = lower(v_app.full_name)
    LIMIT 1;
  END IF;

  IF v_author_id IS NULL THEN
    INSERT INTO authors (name, bio, user_id)
    VALUES (trim(v_app.full_name), coalesce(v_app.bio, ''), v_app.user_id)
    RETURNING id INTO v_author_id;
  ELSE
    UPDATE authors SET user_id = COALESCE(v_app.user_id, user_id)
    WHERE id = v_author_id;
  END IF;

  IF v_app.user_id IS NOT NULL THEN
    UPDATE profiles SET is_admin = true WHERE id = v_app.user_id;
    INSERT INTO admin_users (user_id) VALUES (v_app.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  UPDATE reporter_applications SET
    status         = 'approved',
    author_id      = v_author_id,
    review_comment = nullif(trim(coalesce(p_comment, '')), ''),
    reviewed_by    = auth.uid(),
    reviewed_at    = now()
  WHERE id = p_application_id;

  RETURN json_build_object('success', true, 'status', 'approved', 'author_id', v_author_id);
END;
$$;

REVOKE ALL ON FUNCTION public.review_reporter_application(uuid,boolean,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_reporter_application(uuid,boolean,text) TO authenticated;

-- Manual registration by the CEO/Editor -----------------------------------
CREATE OR REPLACE FUNCTION public.admin_register_reporter(
  p_full_name    text,
  p_email        text,
  p_phone_number text DEFAULT NULL,
  p_bio          text DEFAULT NULL,
  p_comment      text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean;
  v_user_id uuid;
  v_author_id uuid;
  v_app_id uuid;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    UNION
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  IF trim(coalesce(p_full_name, '')) = '' OR trim(coalesce(p_email, '')) = '' THEN
    RETURN json_build_object('success', false, 'error', 'Name and email are required');
  END IF;

  IF EXISTS (
    SELECT 1 FROM reporter_applications WHERE lower(email) = lower(trim(p_email))
  ) THEN
    RETURN json_build_object('success', false, 'error', 'duplicate_email');
  END IF;

  -- Link immediately if this email already has an account
  SELECT id INTO v_user_id FROM auth.users
  WHERE lower(email) = lower(trim(p_email))
  LIMIT 1;

  -- Reuse an existing byline with the same name, or create one
  SELECT id INTO v_author_id FROM authors
  WHERE lower(name) = lower(trim(p_full_name))
  LIMIT 1;

  IF v_author_id IS NULL THEN
    INSERT INTO authors (name, bio, user_id)
    VALUES (trim(p_full_name), coalesce(nullif(trim(coalesce(p_bio, '')), ''), ''), v_user_id)
    RETURNING id INTO v_author_id;
  ELSE
    UPDATE authors SET user_id = COALESCE(v_user_id, user_id)
    WHERE id = v_author_id;
  END IF;

  IF v_user_id IS NOT NULL THEN
    UPDATE profiles SET is_admin = true WHERE id = v_user_id;
    INSERT INTO admin_users (user_id) VALUES (v_user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  INSERT INTO reporter_applications (
    user_id, full_name, email, phone_number, bio,
    status, author_id, review_comment, reviewed_by, reviewed_at
  ) VALUES (
    v_user_id,
    trim(p_full_name),
    trim(p_email),
    nullif(trim(coalesce(p_phone_number, '')), ''),
    nullif(trim(coalesce(p_bio, '')), ''),
    'approved',
    v_author_id,
    nullif(trim(coalesce(p_comment, '')), ''),
    auth.uid(),
    now()
  )
  RETURNING id INTO v_app_id;

  RETURN json_build_object(
    'success', true,
    'id', v_app_id,
    'linked', v_user_id IS NOT NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_register_reporter(text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_register_reporter(text,text,text,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
