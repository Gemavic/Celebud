-- Update trigger to also set submitted_by automatically from auth.uid()
-- This means frontend never needs to send submitted_by or is_manual

CREATE OR REPLACE FUNCTION public.auto_set_is_manual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- On INSERT: if no submitted_by set yet, pull it from the current auth user
  IF TG_OP = 'INSERT' THEN
    IF NEW.submitted_by IS NULL AND auth.uid() IS NOT NULL THEN
      NEW.submitted_by := auth.uid();
    END IF;
  END IF;

  -- If submitted_by is set, this is a manually created article
  IF NEW.submitted_by IS NOT NULL THEN
    NEW.is_manual := true;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS trg_auto_set_is_manual ON media_content;
CREATE TRIGGER trg_auto_set_is_manual
  BEFORE INSERT OR UPDATE ON media_content
  FOR EACH ROW EXECUTE FUNCTION auto_set_is_manual();

NOTIFY pgrst, 'reload schema';
