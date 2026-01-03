-- Add equipment columns to public.buoy and public.res_openwater
SET search_path = public;

-- 1) Add equipment columns to buoy table
ALTER TABLE public.buoy
ADD COLUMN IF NOT EXISTS pulley boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS bottom_plate boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS large_buoy boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS deep_fim_training boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.buoy.pulley IS 'Whether the buoy is equipped with a pulley system';
COMMENT ON COLUMN public.buoy.bottom_plate IS 'Whether the buoy has a bottom plate';
COMMENT ON COLUMN public.buoy.large_buoy IS 'Whether the buoy is a large size buoy';
COMMENT ON COLUMN public.buoy.deep_fim_training IS 'Whether the buoy is set up for deep FIM training';

-- 2) Add missing equipment column to res_openwater table
ALTER TABLE public.res_openwater
ADD COLUMN IF NOT EXISTS deep_fim_training boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.res_openwater.deep_fim_training IS 'Whether the reservation requires deep FIM training equipment';
