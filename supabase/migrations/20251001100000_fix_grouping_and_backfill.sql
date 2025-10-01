-- Fix grouping and backfill members: split legacy diver_ids into buoy_group_members in chunks of 3
set search_path = public;

-- 1) Backfill existing buoy_group.diver_ids into buoy_group_members, splitting to max 3 per group
DO $$
DECLARE
  r record;
  l int;
  i int;
  c int;
  chunk uuid[];
  new_group_id int;
BEGIN
  FOR r IN
    SELECT id, res_date, time_period, buoy_name, boat, note, diver_ids
    FROM public.buoy_group
    WHERE diver_ids IS NOT NULL AND array_length(diver_ids,1) > 0
    ORDER BY id
  LOOP
    l := array_length(r.diver_ids,1);
    i := 1;
    WHILE i <= l LOOP
      c := LEAST(3, l - i + 1);
      chunk := r.diver_ids[i:(i + c - 1)];

      IF i = 1 THEN
        -- fill the existing group id first
        INSERT INTO public.buoy_group_members(group_id, uid)
        SELECT r.id, m FROM unnest(chunk) AS m
        ON CONFLICT DO NOTHING;
      ELSE
        -- create a new group with same meta and insert next chunk
        INSERT INTO public.buoy_group(res_date, time_period, buoy_name, boat, note)
        VALUES (r.res_date, r.time_period, r.buoy_name, r.boat, r.note)
        RETURNING id INTO new_group_id;

        INSERT INTO public.buoy_group_members(group_id, uid)
        SELECT new_group_id, m FROM unnest(chunk) AS m
        ON CONFLICT DO NOTHING;
      END IF;

      i := i + 3;
    END LOOP;

    -- clear legacy array on the original row
    UPDATE public.buoy_group SET diver_ids = NULL WHERE id = r.id;
  END LOOP;
END $$;

-- 2) Drop legacy column to enforce normalized membership (NOTE: regenerate types after applying)
ALTER TABLE public.buoy_group DROP COLUMN IF EXISTS diver_ids;

-- 3) Replace auto_assign_buoy to group strictly by buoy_name, fill groups up to 3, create new groups as needed
CREATE OR REPLACE FUNCTION public.auto_assign_buoy(p_res_date date, p_time_period varchar)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  r_row RECORD;
  v_buoy_name varchar(64);
  v_group_id int;
BEGIN
  -- Admin check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized' USING errcode = '42501';
  END IF;

  -- Iterate all confirmed, unassigned divers for the day/period
  FOR r_row IN
    SELECT o.uid, o.depth_m
    FROM public.res_openwater o
    JOIN public.reservations r ON r.uid = o.uid AND r.res_date = o.res_date
    WHERE r.res_status = 'confirmed'
      AND r.res_type = 'open_water'
      AND o.time_period = p_time_period
      AND o.depth_m IS NOT NULL
      AND o.res_date >= p_res_date::timestamptz
      AND o.res_date <  (p_res_date + 1)::timestamptz
      AND NOT EXISTS (
        SELECT 1 FROM public.buoy_group_members m
        JOIN public.buoy_group g ON g.id = m.group_id
        WHERE g.res_date = p_res_date
          AND g.time_period = p_time_period
          AND m.uid = o.uid
      )
    ORDER BY o.depth_m ASC
  LOOP
    -- Decide buoy for this diver based on depth capability
    v_buoy_name := public.find_best_buoy_for_depth(r_row.depth_m);
    IF v_buoy_name IS NULL THEN
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('reason', 'no_buoy_available', 'uids', array[r_row.uid])
      );
      CONTINUE;
    END IF;

    -- Try to fill existing group with capacity for this buoy/date/period
    SELECT g.id INTO v_group_id
    FROM public.buoy_group g
    LEFT JOIN public.buoy_group_members m ON m.group_id = g.id
    WHERE g.res_date = p_res_date
      AND g.time_period = p_time_period
      AND g.buoy_name = v_buoy_name
    GROUP BY g.id
    HAVING COUNT(m.uid) < 3
    ORDER BY g.id ASC
    LIMIT 1;

    -- If none, create a new group
    IF v_group_id IS NULL THEN
      INSERT INTO public.buoy_group(res_date, time_period, buoy_name)
      VALUES (p_res_date, p_time_period, v_buoy_name)
      RETURNING id INTO v_group_id;
      v_created_ids := v_created_ids || v_group_id;
    END IF;

    -- Insert member (trigger enforces max 3 per group)
    INSERT INTO public.buoy_group_members(group_id, uid)
    VALUES (v_group_id, r_row.uid)
    ON CONFLICT DO NOTHING;
  END LOOP;

  RETURN json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_assign_buoy(date, varchar) TO authenticated;
