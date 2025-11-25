-- Migration: Create Buddy Group RPC
-- Atomic function to create buddy group with members

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

  -- Create buddy group
  INSERT INTO public.buddy_groups (initiator_uid, res_date, time_period, res_type)
  VALUES (p_initiator_uid, p_res_date, p_time_period, p_res_type)
  RETURNING id INTO v_buddy_group_id;

  -- Add initiator to members (status='accepted' by default)
  INSERT INTO public.buddy_group_members (buddy_group_id, uid, status)
  VALUES (v_buddy_group_id, p_initiator_uid, 'accepted');

  -- Add buddies to members
  FOREACH v_buddy_uid IN ARRAY p_buddy_uids
  LOOP
    -- Skip if buddy is same as initiator
    IF v_buddy_uid != p_initiator_uid THEN
      INSERT INTO public.buddy_group_members (buddy_group_id, uid, status)
      VALUES (v_buddy_group_id, v_buddy_uid, 'accepted')
      ON CONFLICT (buddy_group_id, uid) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_buddy_group_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_buddy_group_with_members(uuid, date, text, text, uuid[]) TO authenticated;

COMMENT ON FUNCTION public.create_buddy_group_with_members IS 'Creates a buddy group with initiator and buddies, returns buddy_group_id';
