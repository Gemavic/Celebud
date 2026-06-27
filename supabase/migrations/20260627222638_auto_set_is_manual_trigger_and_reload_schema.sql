-- Auto-set is_manual via trigger so frontend never needs to send it
-- This eliminates the schema cache error on media_content.is_manual

CREATE OR REPLACE FUNCTION public.auto_set_is_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If submitted_by is set (human posted), mark as manual
  IF NEW.submitted_by IS NOT NULL THEN
    NEW.is_manual := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_set_is_manual ON media_content;

CREATE TRIGGER trg_auto_set_is_manual
  BEFORE INSERT OR UPDATE ON media_content
  FOR EACH ROW EXECUTE FUNCTION auto_set_is_manual();

-- Force PostgREST to reload schema for media_content and creator_applications
NOTIFY pgrst, 'reload schema';
