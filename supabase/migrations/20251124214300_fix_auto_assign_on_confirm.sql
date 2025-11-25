-- Fix: Don't trigger auto-assign when confirming reservations
-- Only trigger on INSERT and when status changes TO 'pending' (not FROM pending TO confirmed)

-- Drop existing triggers
DROP TRIGGER IF EXISTS trg_auto_assign_on_insert ON public.reservations;
DROP TRIGGER IF EXISTS trg_auto_assign_on_update ON public.reservations;

-- Recreate INSERT trigger (unchanged - fires on new reservations)
CREATE TRIGGER trg_auto_assign_on_insert
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  WHEN (
    NEW.res_type = 'open_water' 
    AND NEW.res_status IN ('confirmed', 'pending')
  )
  EXECUTE FUNCTION public.invoke_auto_assign_buoy();

-- Recreate UPDATE trigger - ONLY fire when status changes TO 'pending', not FROM 'pending'
CREATE TRIGGER trg_auto_assign_on_update
  AFTER UPDATE OF res_status ON public.reservations
  FOR EACH ROW
  WHEN (
    NEW.res_type = 'open_water'
    AND NEW.res_status = 'pending'
    AND OLD.res_status != 'pending'  -- Only when changing TO pending, not FROM pending
  )
  EXECUTE FUNCTION public.invoke_auto_assign_buoy();

COMMENT ON TRIGGER trg_auto_assign_on_update ON public.reservations IS 'Queue auto-assignment only when status changes TO pending (e.g., from rejected back to pending). Does not fire when confirming (pending -> confirmed).';
