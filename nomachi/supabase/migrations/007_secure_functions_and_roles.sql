-- 1. Revoke execute privileges on critical functions
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.run_sql_query(text) FROM PUBLIC, anon, authenticated;

-- 2. Trigger function to prevent non-admins from updating their own/others roles
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER AS $func$
BEGIN
  -- Check if role is changing
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- If get_my_role() is not 'admin', raise error
    IF NOT (LOWER(COALESCE(public.get_my_role(), '')) = 'admin') THEN
      RAISE EXCEPTION 'Only administrators can change profile roles.';
    END IF;
  END IF;
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Bind the trigger to profiles table
DROP TRIGGER IF EXISTS trigger_check_profile_role_update ON public.profiles;
CREATE TRIGGER trigger_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_update();
