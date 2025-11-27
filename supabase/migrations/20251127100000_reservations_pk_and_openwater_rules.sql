-- Reservations PK refactor and open water uniqueness rules
-- - Adds integer reservation_id primary key on public.reservations
-- - Preserves (uid, res_date) as a unique key for existing relationships
-- - Enforces: at most one open water reservation per user/day/time_period

BEGIN;

-- 1) Add reservation_id column and backfill existing rows
ALTER TABLE IF EXISTS public.reservations
  ADD COLUMN IF NOT EXISTS reservation_id integer;

-- Create sequence for reservation_id if it does not exist yet
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND c.relname = 'reservations_reservation_id_seq'
      AND n.nspname = 'public'
  ) THEN
    CREATE SEQUENCE public.reservations_reservation_id_seq;
  END IF;
END $$;

-- Attach default from sequence (serial-like behaviour)
ALTER TABLE public.reservations
  ALTER COLUMN reservation_id SET DEFAULT nextval('public.reservations_reservation_id_seq');

-- Backfill any existing rows without a reservation_id
UPDATE public.reservations
SET reservation_id = nextval('public.reservations_reservation_id_seq')
WHERE reservation_id IS NULL;

-- Align sequence with current max value
SELECT setval(
  'public.reservations_reservation_id_seq',
  GREATEST(COALESCE((SELECT max(reservation_id) FROM public.reservations), 0), 1),
  true
);

-- Enforce NOT NULL now that all rows have an id
ALTER TABLE public.reservations
  ALTER COLUMN reservation_id SET NOT NULL;

-- 2) Keep (uid, res_date) as a unique business key
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_uid_res_date_key UNIQUE (uid, res_date);

-- 3) Drop existing child FKs that reference the old primary key
ALTER TABLE IF EXISTS public.res_pool
  DROP CONSTRAINT IF EXISTS res_pool_uid_res_date_fkey;

ALTER TABLE IF EXISTS public.res_openwater
  DROP CONSTRAINT IF EXISTS res_openwater_uid_res_date_fkey;

ALTER TABLE IF EXISTS public.res_classroom
  DROP CONSTRAINT IF EXISTS res_classroom_uid_res_date_fkey;

-- 4) Switch primary key to reservation_id
ALTER TABLE IF EXISTS public.reservations
  DROP CONSTRAINT IF EXISTS reservations_pkey;

ALTER TABLE IF EXISTS public.reservations
  ADD CONSTRAINT reservations_pkey PRIMARY KEY (reservation_id);

-- 5) Re-create child FKs referencing (uid, res_date) uniqueness
ALTER TABLE IF EXISTS public.res_pool
  ADD CONSTRAINT res_pool_reservation_fk
  FOREIGN KEY (uid, res_date)
  REFERENCES public.reservations(uid, res_date)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.res_openwater
  ADD CONSTRAINT res_openwater_reservation_fk
  FOREIGN KEY (uid, res_date)
  REFERENCES public.reservations(uid, res_date)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.res_classroom
  ADD CONSTRAINT res_classroom_reservation_fk
  FOREIGN KEY (uid, res_date)
  REFERENCES public.reservations(uid, res_date)
  ON DELETE CASCADE;

-- 6) Enforce: a user can have multiple open water reservations per day
--    but not in the same time period. We rely on canonicalized res_date
--    values per AM/PM slot (e.g. 08:00 for AM, 13:00 for PM), so a
--    uniqueness constraint on (uid, res_date, time_period) is sufficient.
CREATE UNIQUE INDEX IF NOT EXISTS res_openwater_user_day_period_uniq
ON public.res_openwater (
  uid,
  res_date,
  time_period
)
WHERE time_period IS NOT NULL;

COMMIT;
