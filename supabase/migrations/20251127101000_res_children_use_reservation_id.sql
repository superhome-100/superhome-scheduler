-- Link res_* tables to reservations via reservation_id
-- - Adds reservation_id column to res_pool, res_openwater, res_classroom
-- - Backfills from reservations(uid, res_date)
-- - Switches primary keys to reservation_id
-- - Adds foreign keys on reservation_id -> reservations(reservation_id)
-- - Preserves (uid, res_date) uniqueness for compatibility

BEGIN;

-- 1) Add reservation_id column to child tables
ALTER TABLE IF EXISTS public.res_pool
  ADD COLUMN IF NOT EXISTS reservation_id integer;

ALTER TABLE IF EXISTS public.res_openwater
  ADD COLUMN IF NOT EXISTS reservation_id integer;

ALTER TABLE IF EXISTS public.res_classroom
  ADD COLUMN IF NOT EXISTS reservation_id integer;

-- 2) Backfill reservation_id from reservations (uid, res_date)
UPDATE public.res_pool p
SET reservation_id = r.reservation_id
FROM public.reservations r
WHERE r.uid = p.uid
  AND r.res_date = p.res_date
  AND p.reservation_id IS NULL;

UPDATE public.res_openwater o
SET reservation_id = r.reservation_id
FROM public.reservations r
WHERE r.uid = o.uid
  AND r.res_date = o.res_date
  AND o.reservation_id IS NULL;

UPDATE public.res_classroom c
SET reservation_id = r.reservation_id
FROM public.reservations r
WHERE r.uid = c.uid
  AND r.res_date = c.res_date
  AND c.reservation_id IS NULL;

-- 3) Enforce NOT NULL now that data is backfilled
ALTER TABLE public.res_pool
  ALTER COLUMN reservation_id SET NOT NULL;

ALTER TABLE public.res_openwater
  ALTER COLUMN reservation_id SET NOT NULL;

ALTER TABLE public.res_classroom
  ALTER COLUMN reservation_id SET NOT NULL;

-- 4) Preserve (uid, res_date) uniqueness for conflict handling and joins
ALTER TABLE IF EXISTS public.res_pool
  DROP CONSTRAINT IF EXISTS res_pool_pkey;

ALTER TABLE IF EXISTS public.res_pool
  ADD CONSTRAINT res_pool_uid_res_date_key UNIQUE (uid, res_date);

ALTER TABLE IF EXISTS public.res_openwater
  DROP CONSTRAINT IF EXISTS res_openwater_pkey;

ALTER TABLE IF EXISTS public.res_openwater
  ADD CONSTRAINT res_openwater_uid_res_date_key UNIQUE (uid, res_date);

ALTER TABLE IF EXISTS public.res_classroom
  DROP CONSTRAINT IF EXISTS res_classroom_pkey;

ALTER TABLE IF EXISTS public.res_classroom
  ADD CONSTRAINT res_classroom_uid_res_date_key UNIQUE (uid, res_date);

-- 5) Switch primary keys to reservation_id for strict 1-1 with reservations
ALTER TABLE IF EXISTS public.res_pool
  ADD CONSTRAINT res_pool_pkey PRIMARY KEY (reservation_id);

ALTER TABLE IF EXISTS public.res_openwater
  ADD CONSTRAINT res_openwater_pkey PRIMARY KEY (reservation_id);

ALTER TABLE IF EXISTS public.res_classroom
  ADD CONSTRAINT res_classroom_pkey PRIMARY KEY (reservation_id);

-- 6) Drop old FKs on (uid, res_date) and add new FKs on reservation_id
ALTER TABLE IF EXISTS public.res_pool
  DROP CONSTRAINT IF EXISTS res_pool_reservation_fk;

ALTER TABLE IF EXISTS public.res_openwater
  DROP CONSTRAINT IF EXISTS res_openwater_reservation_fk;

ALTER TABLE IF EXISTS public.res_classroom
  DROP CONSTRAINT IF EXISTS res_classroom_reservation_fk;

ALTER TABLE IF EXISTS public.res_pool
  ADD CONSTRAINT res_pool_reservation_fk
  FOREIGN KEY (reservation_id)
  REFERENCES public.reservations(reservation_id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.res_openwater
  ADD CONSTRAINT res_openwater_reservation_fk
  FOREIGN KEY (reservation_id)
  REFERENCES public.reservations(reservation_id)
  ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.res_classroom
  ADD CONSTRAINT res_classroom_reservation_fk
  FOREIGN KEY (reservation_id)
  REFERENCES public.reservations(reservation_id)
  ON DELETE CASCADE;

COMMIT;
