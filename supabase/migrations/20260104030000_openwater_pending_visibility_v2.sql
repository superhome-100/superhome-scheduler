-- Migration: Allow users to see pending Open Water reservations in public views
-- This updates the RPC functions that were previously restricted to 'confirmed' status only
-- and expands the user_profiles visibility to include 'pending' Open Water reservations.
-- Fix: Included admin_note column to match the signature from 20251225133500.

BEGIN;

-- 1. Update get_buoy_groups_public to include pending reservations for Open Water
-- We must match the return signature from 20251225133500_update_get_buoy_groups_public_admin_note.sql
DROP FUNCTION IF EXISTS public.get_buoy_groups_public(date, varchar);

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
  member_statuses text[],
  admin_note text
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
    -- Aggregate UIDs: all confirmed, all pending Open Water, and caller
    array_remove(array_agg(DISTINCT 
      CASE 
        WHEN rv.res_status = 'confirmed' THEN r.uid 
        WHEN rv.res_type = 'open_water' AND rv.res_status = 'pending' THEN r.uid
        WHEN r.uid = v_me THEN r.uid
        ELSE NULL 
      END
    ), null)::uuid[] as member_uids,
    -- Aggregate names
    array_remove(array_agg(DISTINCT
      CASE 
        WHEN rv.res_status = 'confirmed' THEN COALESCE(up.nickname, up.name)
        WHEN rv.res_type = 'open_water' AND rv.res_status = 'pending' THEN COALESCE(up.nickname, up.name)
        WHEN r.uid = v_me THEN COALESCE(up.nickname, up.name)
        ELSE NULL 
      END
    ), null)::text[] as member_names,
    -- count participants (include pending for Open Water as requested)
    count(DISTINCT 
      CASE 
        WHEN rv.res_status = 'confirmed' THEN r.uid 
        WHEN rv.res_type = 'open_water' AND rv.res_status = 'pending' THEN r.uid
        ELSE NULL 
      END
    )::integer as boat_count,
    g.open_water_type::text as open_water_type,
    -- member statuses
    array_remove(array_agg(DISTINCT
      CASE 
        WHEN rv.res_status = 'confirmed' THEN (rv.res_status)::text
        WHEN rv.res_type = 'open_water' AND rv.res_status = 'pending' THEN (rv.res_status)::text
        WHEN r.uid = v_me THEN (rv.res_status)::text
        ELSE NULL 
      END
    ), null)::text[] as member_statuses,
    -- Only expose admin_note to members of the group or admins
    (CASE 
      WHEN v_is_admin THEN MAX(an.admin_note)
      WHEN EXISTS (
        SELECT 1 FROM public.res_openwater r2 
        WHERE r2.group_id = g.id AND r2.uid = v_me
      ) THEN MAX(an.admin_note)
      ELSE NULL 
    END) as admin_note
  FROM public.buoy_group g
  LEFT JOIN public.res_openwater r ON r.group_id = g.id
  LEFT JOIN public.user_profiles up ON up.uid = r.uid
  LEFT JOIN public.reservations rv ON rv.uid = r.uid AND rv.res_date = r.res_date
  LEFT JOIN public.buoy_group_admin_notes an ON an.group_id = g.id
  WHERE g.res_date = p_res_date
    AND g.time_period = p_time_period
    -- Filter groups
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR EXISTS (
        SELECT 1 FROM public.res_openwater r2 
        WHERE r2.group_id = g.id AND r2.uid = v_me
      )
    )
    -- Ensure we only show groups that have at least one visible member
    AND EXISTS (
      SELECT 1 FROM public.res_openwater r3
      JOIN public.reservations rv3 ON rv3.uid = r3.uid AND rv3.res_date = r3.res_date
      WHERE r3.group_id = g.id 
        AND (
          rv3.res_status = 'confirmed' 
          OR (rv3.res_type = 'open_water' AND rv3.res_status = 'pending')
          OR r3.uid = v_me
        )
    )
  GROUP BY g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.open_water_type
  ORDER BY g.buoy_name ASC, g.id ASC;
END;
$$;

-- 2. Update get_openwater_assignment_map to include pending
DROP FUNCTION IF EXISTS public.get_openwater_assignment_map(date);

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
    AND (
      rv.res_status = 'confirmed' 
      OR (rv.res_type = 'open_water' AND rv.res_status = 'pending')
      OR rv.uid = v_me
    )
    -- Filter
    AND (
      v_is_admin
      OR (NOT v_is_disabled)
      OR (r.uid = v_me)
    );
END;
$$;

-- 3. Update user_profiles RLS to expose names for pending Open Water reservations
DROP POLICY IF EXISTS user_profiles_select_when_has_confirmed_reservation ON public.user_profiles;
CREATE POLICY user_profiles_select_when_has_confirmed_reservation
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (
    -- Only expose active users
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM public.reservations r
      WHERE r.uid = user_profiles.uid
        AND (
          r.res_status = 'confirmed'
          OR (r.res_type = 'open_water' AND r.res_status = 'pending')
        )
    )
  );

COMMIT;
