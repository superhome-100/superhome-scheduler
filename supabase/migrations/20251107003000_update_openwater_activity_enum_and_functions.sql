-- Update enum labels for public.openwater_activity_type and refresh related helpers
set search_path = public;

-- 1) Rename enum values to simplified names (idempotent per label)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'openwater_activity_type' AND n.nspname = 'public'
  ) THEN
    -- Rename 'autonomous_buoy_0_89' -> 'autonomous_buoy'
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_buoy_0_89'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_buoy'
    ) THEN
      ALTER TYPE public.openwater_activity_type RENAME VALUE 'autonomous_buoy_0_89' TO 'autonomous_buoy';
    END IF;

    -- Rename 'autonomous_platform_0_99' -> 'autonomous_platform'
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_platform_0_99'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_platform'
    ) THEN
      ALTER TYPE public.openwater_activity_type RENAME VALUE 'autonomous_platform_0_99' TO 'autonomous_platform';
    END IF;

    -- Rename 'autonomous_platform_cbs_90_130' -> 'autonomous_platform_cbs'
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_platform_cbs_90_130'
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'openwater_activity_type'
        AND n.nspname = 'public'
        AND e.enumlabel = 'autonomous_platform_cbs'
    ) THEN
      ALTER TYPE public.openwater_activity_type RENAME VALUE 'autonomous_platform_cbs_90_130' TO 'autonomous_platform_cbs';
    END IF;
  END IF;
END $$;

-- 2) Refresh helper functions to return/accept the simplified enum labels
CREATE OR REPLACE FUNCTION public._compute_openwater_activity_type(
  p_activity public.openwater_activity_type,
  p_depth integer
) RETURNS public.openwater_activity_type
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_activity IS NOT NULL THEN
    RETURN p_activity;
  END IF;
  -- Infer from depth when not provided
  IF p_depth IS NULL THEN
    RETURN 'course_coaching'; -- depth-agnostic default
  END IF;
  IF p_depth BETWEEN 90 AND 130 THEN
    RETURN 'autonomous_platform_cbs';
  ELSIF p_depth BETWEEN 15 AND 89 THEN
    RETURN 'autonomous_buoy';
  ELSIF p_depth BETWEEN 15 AND 99 THEN
    RETURN 'autonomous_platform';
  ELSE
    -- Outside autonomous thresholds, treat as course/coaching
    RETURN 'course_coaching';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._compute_openwater_activity_type(public.openwater_activity_type, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public._validate_openwater_depth(
  p_activity public.openwater_activity_type,
  p_depth integer
) RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_depth IS NULL THEN
    RETURN true; -- allow null depth for course/coaching
  END IF;
  CASE p_activity
    WHEN 'course_coaching' THEN
      RETURN p_depth BETWEEN 0 AND 130;
    WHEN 'autonomous_buoy' THEN
      RETURN p_depth BETWEEN 15 AND 89;
    WHEN 'autonomous_platform' THEN
      RETURN p_depth BETWEEN 15 AND 99;
    WHEN 'autonomous_platform_cbs' THEN
      RETURN p_depth BETWEEN 90 AND 130;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public._validate_openwater_depth(public.openwater_activity_type, integer) TO authenticated;
