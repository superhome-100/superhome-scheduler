-- Migration: Guard against overlapping classroom reservations per room
set search_path = public;

-- Ensure btree_gist for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Normalize/validate room values: allow only '1','2','3' or NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_schema = 'public' AND constraint_name = 'res_classroom_room_valid_values'
  ) THEN
    ALTER TABLE public.res_classroom
      ADD CONSTRAINT res_classroom_room_valid_values
      CHECK (room IS NULL OR room IN ('1','2','3'));
  END IF;
END$$;

-- Guard overlaps via trigger (immutable expressions are not available for generated cols with TZ)
CREATE OR REPLACE FUNCTION public._guard_res_classroom_no_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
SET search_path = public
AS $$
DECLARE
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_exists boolean;
BEGIN
  -- Only enforce when room and both times provided
  IF NEW.room IS NULL OR NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
    RETURN NEW;
  END IF;

  -- Compute day window (UTC-boundary per timestamptz day trunc)
  v_day_start := date_trunc('day', NEW.res_date);
  v_day_end := v_day_start + interval '1 day';

  -- Check for any overlapping reservation on the same room and day (exclude self by PK)
  SELECT EXISTS (
    SELECT 1
    FROM public.res_classroom c
    WHERE c.room = NEW.room
      AND c.res_date >= v_day_start AND c.res_date < v_day_end
      AND NOT (c.uid = NEW.uid AND c.res_date = NEW.res_date)
      AND c.start_time IS NOT NULL AND c.end_time IS NOT NULL
      AND (c.start_time < NEW.end_time AND c.end_time > NEW.start_time)
  ) INTO v_exists;

  IF v_exists THEN
    RAISE EXCEPTION 'Room % is already booked for an overlapping time on this day', NEW.room USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_res_classroom_no_overlap'
  ) THEN
    CREATE TRIGGER trg_res_classroom_no_overlap
      BEFORE INSERT OR UPDATE OF room, start_time, end_time, res_date
      ON public.res_classroom
      FOR EACH ROW
      EXECUTE FUNCTION public._guard_res_classroom_no_overlap();
  END IF;
END$$;
