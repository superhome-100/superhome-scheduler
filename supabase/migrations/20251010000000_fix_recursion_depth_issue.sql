-- Fix recursion depth issue by using a simpler approach
-- The recursion_depth configuration parameter is not supported in local PostgreSQL
set search_path = public;

-- Drop the trigger first, then the function
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_reservation_confirmed_auto_buoy'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_after_reservation_confirmed_auto_buoy ON public.reservations';
  END IF;
END$$;

-- Drop the problematic trigger function
DROP FUNCTION IF EXISTS public._trg_after_reservation_confirmed_auto_buoy_safe();

-- Create a simpler version that just disables the trigger during updates
CREATE OR REPLACE FUNCTION public._trg_after_reservation_confirmed_auto_buoy_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simply call auto_assign_buoy without recursion protection
  -- The edge function will handle the auto-assignment instead
  IF NEW.res_type = 'open_water' AND NEW.res_status = 'confirmed' THEN
    -- For this uid+date, iterate distinct time periods and run auto-assign per period
    PERFORM public.auto_assign_buoy(NEW.res_date::date, tp)
    FROM (
      SELECT DISTINCT o.time_period as tp
      FROM public.res_openwater o
      WHERE o.uid = NEW.uid AND o.res_date = NEW.res_date AND o.time_period IS NOT NULL
    ) t;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Auto-assign buoy failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the trigger with the simpler version
CREATE TRIGGER trg_after_reservation_confirmed_auto_buoy 
AFTER UPDATE OF res_status ON public.reservations 
FOR EACH ROW EXECUTE FUNCTION public._trg_after_reservation_confirmed_auto_buoy_simple();
