-- Fix recursive trigger issue by temporarily disabling the auto-buoy trigger
-- This prevents stack depth exceeded errors when updating reservation status
set search_path = public;

-- Disable the problematic trigger temporarily
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_reservation_confirmed_auto_buoy'
  ) THEN
    EXECUTE 'ALTER TABLE public.reservations DISABLE TRIGGER trg_after_reservation_confirmed_auto_buoy';
  END IF;
END$$;

-- Create a safer version that prevents recursion
CREATE OR REPLACE FUNCTION public._trg_after_reservation_confirmed_auto_buoy_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recursion_depth INTEGER;
BEGIN
  -- Check recursion depth to prevent infinite loops
  SELECT COALESCE(current_setting('recursion_depth', true), '0')::INTEGER INTO v_recursion_depth;
  
  -- If we're already in a recursive call, skip processing
  IF v_recursion_depth > 0 THEN
    RETURN NEW;
  END IF;
  
  -- Set recursion depth flag
  PERFORM set_config('recursion_depth', '1', true);
  
  IF NEW.res_type = 'open_water' AND NEW.res_status = 'confirmed' THEN
    -- For this uid+date, iterate distinct time periods and run auto-assign per period
    PERFORM public.auto_assign_buoy(NEW.res_date::date, tp)
    FROM (
      SELECT DISTINCT o.time_period as tp
      FROM public.res_openwater o
      WHERE o.uid = NEW.uid AND o.res_date = NEW.res_date AND o.time_period IS NOT NULL
    ) t;
  END IF;
  
  -- Reset recursion depth flag
  PERFORM set_config('recursion_depth', '0', true);
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Reset recursion depth flag on error
    PERFORM set_config('recursion_depth', '0', true);
    RAISE;
END;
$$;

-- Replace the trigger with the safer version
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_reservation_confirmed_auto_buoy'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_after_reservation_confirmed_auto_buoy ON public.reservations';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_after_reservation_confirmed_auto_buoy 
           AFTER UPDATE OF res_status ON public.reservations 
           FOR EACH ROW EXECUTE FUNCTION public._trg_after_reservation_confirmed_auto_buoy_safe()';
END$$;
