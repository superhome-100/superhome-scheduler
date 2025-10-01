-- Migration: Make public.buoy use buoy_name as the primary key and drop id
-- This change is safe for auto-assign which uses buoy_name and max_depth only

BEGIN;

-- Ensure buoy_name is not null
ALTER TABLE public.buoy
  ALTER COLUMN buoy_name SET NOT NULL;

-- Drop existing primary key if present
DO $$
DECLARE
  pk_name text;
BEGIN
  SELECT conname INTO pk_name
  FROM pg_constraint
  WHERE conrelid = 'public.buoy'::regclass
    AND contype = 'p'
  LIMIT 1;

  IF pk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.buoy DROP CONSTRAINT %I', pk_name);
  END IF;
END $$;

-- Drop the id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'buoy'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE public.buoy DROP COLUMN id;
  END IF;
END $$;

-- Add primary key on buoy_name
ALTER TABLE public.buoy
  ADD CONSTRAINT buoy_pkey PRIMARY KEY (buoy_name);

COMMIT;
