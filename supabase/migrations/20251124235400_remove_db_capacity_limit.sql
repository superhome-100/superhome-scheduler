-- Remove database-level capacity enforcement
-- The 3-member limit will be handled by the auto-assign algorithm only

-- Drop the trigger on res_openwater
DROP TRIGGER IF EXISTS trg_res_openwater_group_limit ON public.res_openwater;

-- Drop the enforcement function
DROP FUNCTION IF EXISTS public._enforce_max_three_members_res_openwater();

-- Update comment to reflect change
COMMENT ON COLUMN public.res_openwater.group_id IS 'Foreign key to buoy_group.id - links reservation to assigned buoy group. Capacity limits are handled by application logic.';
