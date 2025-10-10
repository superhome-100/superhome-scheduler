-- Add Open Water activity type and update auto-assign grouping to prioritize by activity type
set search_path = public;

-- 1) Create enum for open water activity types (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'openwater_activity_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.openwater_activity_type AS ENUM (
      'course_coaching',
      'autonomous_buoy_0_89',
      'autonomous_platform_0_99',
      'autonomous_platform_cbs_90_130'
    );
  END IF;
END $$;

-- 2) Add column to res_openwater (nullable to allow gradual backfill)
ALTER TABLE public.res_openwater
  ADD COLUMN IF NOT EXISTS activity_type public.openwater_activity_type;

COMMENT ON COLUMN public.res_openwater.activity_type IS 'Open water reservation sub-type used for grouping and validation.';

-- 3) Helper: compute effective activity type when column is null, based on depth thresholds from plans/OWtypes.md
--    This preserves behavior for existing data until UI writes the column explicitly.
CREATE OR REPLACE FUNCTION public._compute_openwater_activity_type(p_activity public.openwater_activity_type, p_depth integer)
RETURNS public.openwater_activity_type
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
    RETURN 'autonomous_platform_cbs_90_130';
  ELSIF p_depth BETWEEN 15 AND 89 THEN
    RETURN 'autonomous_buoy_0_89';
  ELSIF p_depth BETWEEN 90 AND 99 THEN
    -- already handled above, but keep explicitness
    RETURN 'autonomous_platform_cbs_90_130';
  ELSIF p_depth BETWEEN 15 AND 99 THEN
    RETURN 'autonomous_platform_0_99';
  ELSE
    -- Outside autonomous thresholds, treat as course/coaching
    RETURN 'course_coaching';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public._compute_openwater_activity_type(public.openwater_activity_type, integer) TO authenticated;

-- 4) Optional: server-side depth validation helper aligned to activity type
CREATE OR REPLACE FUNCTION public._validate_openwater_depth(p_activity public.openwater_activity_type, p_depth integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_depth IS NULL THEN
    RETURN true; -- allow null depth for course/coaching
  END IF;
  CASE p_activity
    WHEN 'course_coaching' THEN
      RETURN p_depth BETWEEN 0 AND 130;
    WHEN 'autonomous_buoy_0_89' THEN
      RETURN p_depth BETWEEN 15 AND 89;
    WHEN 'autonomous_platform_0_99' THEN
      RETURN p_depth BETWEEN 15 AND 99;
    WHEN 'autonomous_platform_cbs_90_130' THEN
      RETURN p_depth BETWEEN 90 AND 130;
    ELSE
      RETURN false;
  END CASE;
END;
$$;

GRANT EXECUTE ON FUNCTION public._validate_openwater_depth(public.openwater_activity_type, integer) TO authenticated;

-- 5) Ensure helper to process a buoy group exists (self-contained for this migration)
CREATE OR REPLACE FUNCTION public._process_buoy_group(
  p_res_date date,
  p_time_period varchar,
  p_group_uids uuid[],
  p_group_depths int[],
  INOUT p_created_ids int[],
  INOUT p_skipped jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buoy_name varchar;
  v_group_id int;
  v_max_depth int;
  v_uid uuid;
BEGIN
  -- Skip empty groups
  IF array_length(p_group_uids, 1) IS NULL OR array_length(p_group_uids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Find the maximum depth in the group (treat null depths as 0)
  v_max_depth := (
    SELECT max(d)
    FROM unnest(
      COALESCE(p_group_depths, ARRAY[0])
    ) AS d
  );

  -- Pick the smallest buoy that can accommodate the group's max depth
  SELECT b.buoy_name INTO v_buoy_name
  FROM public.buoy b
  WHERE b.max_depth >= v_max_depth
  ORDER BY b.max_depth ASC
  LIMIT 1;

  IF v_buoy_name IS NULL THEN
    p_skipped := p_skipped || jsonb_build_object(
      'reason', 'no_buoy_available',
      'uids', to_jsonb(p_group_uids)
    );
    RETURN;
  END IF;

  -- Create a new group
  INSERT INTO public.buoy_group(res_date, time_period, buoy_name)
  VALUES (p_res_date, p_time_period, v_buoy_name)
  RETURNING id INTO v_group_id;

  -- Assign all divers in the group to this buoy group
  FOREACH v_uid IN ARRAY p_group_uids
  LOOP
    UPDATE public.res_openwater
    SET group_id = v_group_id
    WHERE uid = v_uid
      AND res_date >= p_res_date::timestamptz
      AND res_date < (p_res_date + 1)::timestamptz
      AND time_period = p_time_period;
  END LOOP;

  p_created_ids := p_created_ids || v_group_id;
END;
$$;

-- 6) Update the auto_assign_buoy RPC to group by activity type first, then by depth proximity (<=15m), max 3 per group
CREATE OR REPLACE FUNCTION public.auto_assign_buoy(p_res_date date, p_time_period varchar)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_type public.openwater_activity_type;
  v_res record;
  v_group_uids uuid[];
  v_group_depths int[];
  v_group_size int;
BEGIN
  -- Admin-only
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  -- Clear existing groups for this date/period
  UPDATE public.res_openwater
  SET group_id = NULL
  WHERE res_date >= p_res_date::timestamptz
    AND res_date < (p_res_date + 1)::timestamptz
    AND time_period = p_time_period;

  DELETE FROM public.buoy_group
  WHERE res_date = p_res_date
    AND time_period = p_time_period;

  -- Process per activity type in deterministic order
  FOR v_type IN
    SELECT unnest(enum_range(NULL::public.openwater_activity_type))
  LOOP
    v_group_uids := NULL; v_group_depths := NULL;

    FOR v_res IN
      SELECT o.uid, o.depth_m
      FROM public.res_openwater o
      JOIN public.reservations r ON r.uid = o.uid AND r.res_date = o.res_date
      WHERE r.res_status = 'confirmed'
        AND r.res_type = 'open_water'
        AND o.time_period = p_time_period
        AND o.res_date >= p_res_date::timestamptz
        AND o.res_date < (p_res_date + 1)::timestamptz
        AND public._compute_openwater_activity_type(o.activity_type, o.depth_m) = v_type
      ORDER BY o.depth_m NULLS LAST
    LOOP
      IF v_group_uids IS NULL OR array_length(v_group_uids, 1) IS NULL THEN
        v_group_uids := ARRAY[v_res.uid];
        v_group_depths := ARRAY[COALESCE(v_res.depth_m, 0)];
      ELSE
        v_group_size := array_length(v_group_uids, 1);
        -- Depth proximity within type: allow <=15m diff; if depth is null, start new group
        IF v_group_size < 3 AND v_res.depth_m IS NOT NULL AND abs(v_res.depth_m - (SELECT max(d) FROM unnest(v_group_depths) AS d)) <= 15 THEN
          v_group_uids := v_group_uids || v_res.uid;
          v_group_depths := v_group_depths || v_res.depth_m;
        ELSE
          PERFORM public._process_buoy_group(p_res_date, p_time_period, v_group_uids, v_group_depths, v_created_ids, v_skipped);
          v_group_uids := ARRAY[v_res.uid];
          v_group_depths := ARRAY[COALESCE(v_res.depth_m, 0)];
        END IF;
      END IF;
    END LOOP;

    IF v_group_uids IS NOT NULL AND array_length(v_group_uids, 1) IS NOT NULL THEN
      PERFORM public._process_buoy_group(p_res_date, p_time_period, v_group_uids, v_group_depths, v_created_ids, v_skipped);
    END IF;
  END LOOP;

  RETURN json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'::int[]),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_assign_buoy(date, varchar) TO authenticated;
