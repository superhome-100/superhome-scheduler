-- Migration: Add student_count to res_pool and res_classroom
-- Notes:
-- - Nullable integer to keep backward compatibility
-- - No default value; UI will only send when Course/Coaching is selected
-- - Do NOT delete migrations per repository rules

BEGIN;

-- Add column to res_pool if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_pool' AND column_name = 'student_count'
  ) THEN
    ALTER TABLE public.res_pool
    ADD COLUMN student_count integer NULL;
  END IF;
END$$;

-- Add column to res_classroom if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_classroom' AND column_name = 'student_count'
  ) THEN
    ALTER TABLE public.res_classroom
    ADD COLUMN student_count integer NULL;
  END IF;
END$$;

COMMIT;
