-- Migration: Improve disabled user business logic
-- Disabled users should only see their own reservations and not other people's bookings in Calendar/Daily views.

BEGIN;

-- 1. Helper function to check if current user is disabled
CREATE OR REPLACE FUNCTION public.is_disabled()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE uid = auth.uid() 
      AND status = 'disabled'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_disabled() TO authenticated;

-- 2. Update RLS Policies

-- reservations
DROP POLICY IF EXISTS reservations_select_confirmed_for_all ON public.reservations;
DROP POLICY IF EXISTS reservations_select_openwater_pending_for_all ON public.reservations;

CREATE POLICY reservations_select_confirmed_for_all
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    (res_status = 'confirmed' AND NOT public.is_disabled())
    OR (uid = auth.uid())
    OR public.is_admin()
  );

CREATE POLICY reservations_select_openwater_pending_for_all
  ON public.reservations
  FOR SELECT
  TO authenticated
  USING (
    (res_type = 'open_water' AND res_status IN ('confirmed', 'pending') AND NOT public.is_disabled())
    OR (uid = auth.uid())
    OR public.is_admin()
  );

-- res_openwater
DROP POLICY IF EXISTS res_openwater_select_if_parent_confirmed ON public.res_openwater;
DROP POLICY IF EXISTS res_openwater_select_if_parent_openwater_pending_or_confirmed ON public.res_openwater;

CREATE POLICY res_openwater_select_if_parent_confirmed
  ON public.res_openwater
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations rv
      WHERE rv.uid = res_openwater.uid
        AND rv.res_date = res_openwater.res_date
        AND (
          (rv.res_status = 'confirmed' AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
  );

CREATE POLICY res_openwater_select_if_parent_openwater_pending_or_confirmed
  ON public.res_openwater
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations rv
      WHERE rv.uid = res_openwater.uid
        AND rv.res_date = res_openwater.res_date
        AND (
          (rv.res_type = 'open_water' AND rv.res_status IN ('confirmed', 'pending') AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
  );

-- res_pool
DROP POLICY IF EXISTS res_pool_select_if_parent_confirmed ON public.res_pool;
CREATE POLICY res_pool_select_if_parent_confirmed
  ON public.res_pool
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations rv
      WHERE rv.uid = res_pool.uid
        AND rv.res_date = res_pool.res_date
        AND (
          (rv.res_status = 'confirmed' AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
  );

-- res_classroom
DROP POLICY IF EXISTS res_classroom_select_if_parent_confirmed ON public.res_classroom;
CREATE POLICY res_classroom_select_if_parent_confirmed
  ON public.res_classroom
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reservations rv
      WHERE rv.uid = res_classroom.uid
        AND rv.res_date = res_classroom.res_date
        AND (
          (rv.res_status = 'confirmed' AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
  );

-- buoy_group
DROP POLICY IF EXISTS buoy_group_select_if_any_confirmed_member ON public.buoy_group;
DROP POLICY IF EXISTS buoy_group_select_if_any_openwater_pending_or_confirmed ON public.buoy_group;

CREATE POLICY buoy_group_select_if_any_confirmed_member
  ON public.buoy_group
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.res_openwater r
      JOIN public.reservations rv ON rv.uid = r.uid AND rv.res_date = r.res_date
      WHERE r.group_id = buoy_group.id
        AND (
          (rv.res_status = 'confirmed' AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
    OR public.is_admin()
  );

CREATE POLICY buoy_group_select_if_any_openwater_pending_or_confirmed
  ON public.buoy_group
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.res_openwater r
      JOIN public.reservations rv ON rv.uid = r.uid AND rv.res_date = r.res_date
      WHERE r.group_id = buoy_group.id
        AND (
          (rv.res_type = 'open_water' AND rv.res_status IN ('confirmed', 'pending') AND NOT public.is_disabled())
          OR (rv.uid = auth.uid())
          OR public.is_admin()
        )
    )
    OR public.is_admin()
  );

-- 3. Update RPC Functions (Security Definer)

-- get_monthly_reservation_stats
CREATE OR REPLACE FUNCTION public.get_monthly_reservation_stats(
  start_date date,
  end_date date
)
RETURNS TABLE (
  res_date date,
  res_type reservation_type,
  time_period text,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_disabled boolean;
  v_is_admin boolean;
  v_me uuid;
BEGIN
  v_me := auth.uid();
  v_is_disabled := public.is_disabled();
  v_is_admin := public.is_admin();

  RETURN QUERY
  
  -- Open Water
  SELECT
    r.res_date::date,
    r.res_type,
    COALESCE(ow.time_period, 'AM') as time_period,
    SUM(1 + COALESCE(ow.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_openwater ow ON r.uid = ow.uid AND r.res_date = ow.res_date
  WHERE r.res_date >= start_date 
    AND r.res_date <= end_date
    AND r.res_type = 'open_water'
    AND r.res_status IN ('confirmed', 'pending')
    AND (
      v_is_admin -- Admin sees all
      OR (NOT v_is_disabled) -- Active users see all confirmed/pending (pending visibility is usually restricted but here we follow stats)
      OR (r.uid = v_me) -- Disabled user ONLY sees their own
    )
  GROUP BY r.res_date::date, r.res_type, ow.time_period

  UNION ALL

  -- Pool
  SELECT
    r.res_date::date,
    r.res_type,
    'ALL' as time_period,
    SUM(1 + COALESCE(p.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_pool p ON r.uid = p.uid AND r.res_date = p.res_date
  WHERE r.res_date >= start_date 
    AND r.res_date <= end_date
    AND r.res_type = 'pool'
    AND r.res_status IN ('confirmed', 'pending')
    AND p.start_time IS NOT NULL 
    AND p.end_time IS NOT NULL 
    -- Filter
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR (r.uid = v_me)
    )
  GROUP BY r.res_date::date, r.res_type

  UNION ALL

  -- Classroom
  SELECT
    r.res_date::date,
    r.res_type,
    'ALL' as time_period,
    SUM(1 + COALESCE(c.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_classroom c ON r.uid = c.uid AND r.res_date = c.res_date
  WHERE r.res_date >= start_date 
    AND r.res_date <= end_date
    AND r.res_type = 'classroom'
    AND r.res_status IN ('confirmed', 'pending')
    AND c.start_time IS NOT NULL 
    AND c.end_time IS NOT NULL
    -- Filter
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR (r.uid = v_me)
    )
  GROUP BY r.res_date::date, r.res_type;

END;
$$;

-- get_buoy_groups_public
CREATE OR REPLACE FUNCTION public.get_buoy_groups_public(
  p_res_date date,
  p_time_period varchar
)
RETURNS TABLE (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  member_uids uuid[],
  member_names text[],
  boat_count integer,
  open_water_type text,
  member_statuses text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_disabled boolean;
  v_is_admin boolean;
  v_me uuid;
BEGIN
  v_me := auth.uid();
  v_is_disabled := public.is_disabled();
  v_is_admin := public.is_admin();

  RETURN QUERY
  SELECT
    g.id,
    g.res_date,
    g.time_period,
    g.buoy_name,
    g.boat,
    array_remove(array_agg(r.uid ORDER BY r.uid), null)::uuid[] as member_uids,
    array_remove(array_agg(COALESCE(up.nickname, up.name) ORDER BY COALESCE(up.nickname, up.name)), null)::text[] as member_names,
    COALESCE(g.boat_count, count(r.uid))::integer as boat_count,
    g.open_water_type::text as open_water_type,
    array_remove(array_agg((rv.res_status)::text), null)::text[] as member_statuses
  FROM public.buoy_group g
  LEFT JOIN public.res_openwater r ON r.group_id = g.id
  LEFT JOIN public.user_profiles up ON up.uid = r.uid
  LEFT JOIN public.reservations rv ON rv.uid = r.uid AND rv.res_date = r.res_date
  WHERE g.res_date = p_res_date
    AND g.time_period = p_time_period
    AND (rv.res_status = 'confirmed' OR rv.uid = v_me)
    -- Filter groups
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR EXISTS (
        SELECT 1 FROM public.res_openwater r2 
        WHERE r2.group_id = g.id AND r2.uid = v_me
      )
    )
  GROUP BY g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.boat_count, g.open_water_type
  ORDER BY g.buoy_name ASC, g.id ASC;
END;
$$;

-- get_openwater_assignment_map
CREATE OR REPLACE FUNCTION public.get_openwater_assignment_map(
  p_res_date date
)
RETURNS TABLE (
  uid uuid,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  res_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_disabled boolean;
  v_is_admin boolean;
  v_me uuid;
BEGIN
  v_me := auth.uid();
  v_is_disabled := public.is_disabled();
  v_is_admin := public.is_admin();

  RETURN QUERY
  SELECT
    r.uid,
    r.time_period,
    bg.buoy_name,
    bg.boat,
    r.res_date::date
  FROM public.res_openwater r
  LEFT JOIN public.buoy_group bg ON bg.id = r.group_id
  LEFT JOIN public.reservations rv ON rv.uid = r.uid AND rv.res_date = r.res_date
  WHERE r.group_id IS NOT NULL
    AND r.res_date::date = p_res_date
    AND (rv.res_status = 'confirmed' OR rv.uid = v_me)
    -- Filter
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR (r.uid = v_me)
    );
END;
$$;

-- get_buddy_group_with_members
CREATE OR REPLACE FUNCTION public.get_buddy_group_with_members(p_res_date date, p_time_period text, p_res_type text)
RETURNS TABLE (
  buddy_group_id uuid,
  res_type text,
  initiator_uid uuid,
  member_uid uuid,
  member_status text,
  buoy text,
  depth_m integer,
  open_water_type text,
  lane text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_disabled boolean;
  v_is_admin boolean;
  v_me uuid;
BEGIN
  v_me := auth.uid();
  v_is_disabled := public.is_disabled();
  v_is_admin := public.is_admin();

  RETURN QUERY
  SELECT 
    bg.id as buddy_group_id,
    bg.res_type,
    bg.initiator_uid,
    bgm.uid as member_uid,
    bgm.status as member_status,
    CASE 
      WHEN bg.res_type = 'open_water' THEN ro.buoy
      ELSE NULL
    END as buoy,
    ro.depth_m,
    ro.open_water_type,
    rp.lane
  FROM public.buddy_groups bg
  JOIN public.buddy_group_members bgm ON bgm.buddy_group_id = bg.id
  LEFT JOIN public.res_openwater ro ON ro.uid = bgm.uid AND ro.res_date = bg.res_date AND bg.res_type = 'open_water'
  LEFT JOIN public.res_pool rp ON rp.uid = bgm.uid AND rp.res_date = bg.res_date AND bg.res_type = 'pool'
  WHERE bg.res_date = p_res_date
    AND bg.time_period = p_time_period
    AND bg.res_type = p_res_type
    AND bgm.status = 'accepted'
    -- Filter
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR EXISTS (
        SELECT 1 FROM public.buddy_group_members bgm2 
        WHERE bgm2.buddy_group_id = bg.id AND bgm2.uid = v_me
      )
    )
  ORDER BY bg.id, bgm.invited_at;
END;
$$;

COMMIT;
