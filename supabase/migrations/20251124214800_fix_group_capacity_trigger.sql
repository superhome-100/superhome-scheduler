-- Fix: Capacity trigger should only check when group_id is being set/changed
-- Not when other columns (like res_status) are being updated

DROP TRIGGER IF EXISTS trg_res_openwater_group_limit ON public.res_openwater;

CREATE OR REPLACE FUNCTION public._enforce_max_three_members_res_openwater()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only check capacity when group_id is being set or changed
  -- Skip if this is an UPDATE and group_id is not changing
  IF (TG_OP = 'UPDATE' AND (OLD.group_id IS NOT DISTINCT FROM NEW.group_id)) THEN
    RETURN NEW; -- group_id not changing, skip capacity check
  END IF;

  -- Only check if group_id is being set (not NULL)
  IF NEW.group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check if the group already has 3 members
  IF (
    SELECT COUNT(*) FROM public.res_openwater r WHERE r.group_id = NEW.group_id
  ) >= 3 THEN
    RAISE EXCEPTION 'buoy_group % already has 3 members', NEW.group_id USING ERRCODE = '23514';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trg_res_openwater_group_limit
  BEFORE INSERT OR UPDATE ON public.res_openwater
  FOR EACH ROW
  EXECUTE FUNCTION public._enforce_max_three_members_res_openwater();

COMMENT ON FUNCTION public._enforce_max_three_members_res_openwater() IS 'Enforces max 3 members per buoy group. Only checks when group_id is being set or changed, not on other column updates (e.g., res_status).';
