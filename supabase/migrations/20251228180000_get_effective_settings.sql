-- Migration: Add get_effective_settings function
-- Description: Function to retrieve the effective settings configuration for a given date (or now).

CREATE OR REPLACE FUNCTION public.get_effective_settings(t_date timestamptz DEFAULT now())
RETURNS SETOF public.settings_updates
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT *
  FROM public.settings_updates
  WHERE created_at <= t_date
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_settings(timestamptz) TO authenticated;
