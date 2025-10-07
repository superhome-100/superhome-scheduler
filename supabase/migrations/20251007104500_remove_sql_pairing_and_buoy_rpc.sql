-- Migration: Remove SQL-based pairing trigger and RPCs in favor of Edge Functions
set search_path = public;

-- Drop trigger that auto-paired on reservation status update (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_reservation_confirmed'
  ) THEN
    EXECUTE 'DROP TRIGGER trg_after_reservation_confirmed ON public.reservations';
  END IF;
END$$;

-- Drop functions if they exist (pairing and admin buoy assignment)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auto_pair_open_water' AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'DROP FUNCTION public.auto_pair_open_water(uuid, timestamptz)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_openwater_pair_info' AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'DROP FUNCTION public.get_openwater_pair_info(uuid, timestamptz)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'auto_assign_buoy' AND pg_function_is_visible(oid)
  ) THEN
    EXECUTE 'DROP FUNCTION public.auto_assign_buoy(date, varchar)';
  END IF;
END$$;

-- Keep tables, RLS, and indexes intact. All pairing and buoy assignment is now handled by Edge Functions.
