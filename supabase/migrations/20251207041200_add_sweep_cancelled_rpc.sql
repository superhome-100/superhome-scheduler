-- Migration: Make buddy group creation idempotent and add sweep helper
-- Purpose: Prevent duplicate key violations on (initiator_uid, res_date, time_period, res_type)
-- by upserting and returning the existing/created group id. Also provide an optional
-- helper to sweep cancelled/rejected reservations for a specific user/date/slot.

-- 1) Idempotent buddy group RPC using UPSERT
CREATE OR REPLACE FUNCTION public.create_buddy_group_with_members(
  p_initiator_uid uuid,
  p_res_date date,
  p_time_period text,
  p_res_type text,
  p_buddy_uids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  v_buddy_group_id uuid;
  v_buddy_uid uuid;
BEGIN
  -- Validate res_type
  IF p_res_type NOT IN ('pool', 'open_water') THEN
    RAISE EXCEPTION 'Invalid res_type: %', p_res_type;
  END IF;

  -- Validate buddy count (max 2)
  IF array_length(p_buddy_uids, 1) > 2 THEN
    RAISE EXCEPTION 'Maximum 2 buddies allowed';
  END IF;

  -- Create or reuse buddy group via UPSERT
  INSERT INTO public.buddy_groups (initiator_uid, res_date, time_period, res_type)
  VALUES (p_initiator_uid, p_res_date, p_time_period, p_res_type)
  ON CONFLICT (initiator_uid, res_date, time_period, res_type)
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_buddy_group_id;

  -- Ensure initiator is a member (accepted)
  INSERT INTO public.buddy_group_members (buddy_group_id, uid, status)
  VALUES (v_buddy_group_id, p_initiator_uid, 'accepted')
  ON CONFLICT (buddy_group_id, uid) DO UPDATE SET status = EXCLUDED.status, responded_at = now();

  -- Ensure buddies are present (accepted for now)
  IF p_buddy_uids IS NOT NULL THEN
    FOREACH v_buddy_uid IN ARRAY p_buddy_uids
    LOOP
      IF v_buddy_uid IS NOT NULL AND v_buddy_uid <> p_initiator_uid THEN
        INSERT INTO public.buddy_group_members (buddy_group_id, uid, status)
        VALUES (v_buddy_group_id, v_buddy_uid, 'accepted')
        ON CONFLICT (buddy_group_id, uid) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN v_buddy_group_id;
END;
$$;

COMMENT ON FUNCTION public.create_buddy_group_with_members(uuid, date, text, text, uuid[])
IS 'Idempotent creation of buddy group and members. Returns existing group when unique key exists.';

-- 2) Optional helper to sweep cancelled/rejected shells for a specific user/date/slot
--    Use carefully from server-side code with service role.
CREATE OR REPLACE FUNCTION public.sweep_cancelled_for_slot(
  p_uid uuid,
  p_res_date date,
  p_time_key text,            -- HH:MM for pool/classroom, or 'AM'/'PM' for open_water
  p_res_type text             -- 'pool' | 'classroom' | 'open_water' | 'any'
) RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  r RECORD;
  v_from timestamptz := (p_res_date::text || ' 00:00:00+00')::timestamptz;
  v_to   timestamptz := (p_res_date::text || ' 23:59:59+00')::timestamptz;
BEGIN
  FOR r IN
    SELECT reservation_id, res_type
    FROM public.reservations
    WHERE uid = p_uid
      AND res_date >= v_from
      AND res_date <= v_to
      AND lower(res_status) IN ('cancelled','rejected')
  LOOP
    -- Filter by time key
    IF r.res_type = 'open_water' THEN
      IF upper(p_time_key) NOT IN ('AM','PM') THEN CONTINUE; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.res_openwater ro
        WHERE ro.reservation_id = r.reservation_id AND upper(ro.time_period) = upper(p_time_key)
      ) THEN CONTINUE; END IF;
    ELSIF r.res_type = 'pool' THEN
      IF p_time_key !~ '^[0-2]?\d:[0-5]\d$' THEN CONTINUE; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.res_pool rp
        WHERE rp.reservation_id = r.reservation_id AND substring(rp.start_time,1,5) = substring(p_time_key,1,5)
      ) THEN CONTINUE; END IF;
    ELSIF r.res_type = 'classroom' THEN
      IF p_time_key !~ '^[0-2]?\d:[0-5]\d$' THEN CONTINUE; END IF;
      IF NOT EXISTS (
        SELECT 1 FROM public.res_classroom rc
        WHERE rc.reservation_id = r.reservation_id AND substring(rc.start_time,1,5) = substring(p_time_key,1,5)
      ) THEN CONTINUE; END IF;
    END IF;

    -- Respect p_res_type filter if provided
    IF p_res_type IS NOT NULL AND p_res_type <> 'any' AND p_res_type <> r.res_type THEN
      CONTINUE;
    END IF;

    -- Delete detail then parent
    IF r.res_type = 'open_water' THEN
      DELETE FROM public.res_openwater WHERE reservation_id = r.reservation_id;
    ELSIF r.res_type = 'pool' THEN
      DELETE FROM public.res_pool WHERE reservation_id = r.reservation_id;
    ELSIF r.res_type = 'classroom' THEN
      DELETE FROM public.res_classroom WHERE reservation_id = r.reservation_id;
    END IF;
    DELETE FROM public.reservations WHERE reservation_id = r.reservation_id;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.sweep_cancelled_for_slot IS 'Deletes cancelled/rejected reservation shells for a user at a specific date/time slot.';
