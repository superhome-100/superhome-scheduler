-- Migration: Add Buddy Groups
-- Allows users to create reservations with buddies
-- Buddies can accept/decline invitations
-- Auto-assignment respects buddy groupings

-- 1. Create buddy_groups table
CREATE TABLE IF NOT EXISTS public.buddy_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_uid uuid NOT NULL,
  res_date date NOT NULL,
  time_period text NOT NULL,
  res_type text NOT NULL CHECK (res_type IN ('pool', 'open_water')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(initiator_uid, res_date, time_period, res_type),
  FOREIGN KEY (initiator_uid) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create buddy_group_members table
-- default is 'accepted' for now, will change later to 'pending'
CREATE TABLE IF NOT EXISTS public.buddy_group_members (
  buddy_group_id uuid NOT NULL REFERENCES public.buddy_groups(id) ON DELETE CASCADE,
  uid uuid NOT NULL,
  status text NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted', 'declined')),
  invited_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  PRIMARY KEY (buddy_group_id, uid),
  FOREIGN KEY (uid) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Add buddy_group_id to res_openwater and res_pool
ALTER TABLE public.res_openwater 
ADD COLUMN IF NOT EXISTS buddy_group_id uuid REFERENCES public.buddy_groups(id) ON DELETE SET NULL;

ALTER TABLE public.res_pool 
ADD COLUMN IF NOT EXISTS buddy_group_id uuid REFERENCES public.buddy_groups(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS buddy_groups_date_type_idx 
  ON public.buddy_groups(res_date, time_period, res_type);

CREATE INDEX IF NOT EXISTS buddy_groups_initiator_idx 
  ON public.buddy_groups(initiator_uid);

CREATE INDEX IF NOT EXISTS buddy_group_members_uid_idx 
  ON public.buddy_group_members(uid);

CREATE INDEX IF NOT EXISTS buddy_group_members_status_idx 
  ON public.buddy_group_members(status) 
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS res_openwater_buddy_group_idx 
  ON public.res_openwater(buddy_group_id) 
  WHERE buddy_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS res_pool_buddy_group_idx 
  ON public.res_pool(buddy_group_id) 
  WHERE buddy_group_id IS NOT NULL;

-- 5. Enable RLS
ALTER TABLE public.buddy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_group_members ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for buddy_groups

-- Users can view buddy groups they're part of (initiator or member)
CREATE POLICY "Users can view own buddy groups" 
  ON public.buddy_groups
  FOR SELECT
  TO authenticated
  USING (
    initiator_uid = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.buddy_group_members
      WHERE buddy_group_id = id AND uid = auth.uid()
    )
  );

-- Users can create buddy groups
CREATE POLICY "Users can create buddy groups" 
  ON public.buddy_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (initiator_uid = auth.uid());

-- Only initiator can delete buddy groups
CREATE POLICY "Initiator can delete buddy groups" 
  ON public.buddy_groups
  FOR DELETE
  TO authenticated
  USING (initiator_uid = auth.uid());

-- Admins can view all buddy groups
CREATE POLICY "Admins can view all buddy groups" 
  ON public.buddy_groups
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- 7. RLS Policies for buddy_group_members

-- Users can view members of buddy groups they're part of
CREATE POLICY "Users can view buddy group members" 
  ON public.buddy_group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buddy_groups
      WHERE id = buddy_group_id
      AND (
        initiator_uid = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.buddy_group_members m
          WHERE m.buddy_group_id = buddy_group_id AND m.uid = auth.uid()
        )
      )
    )
  );

-- Only initiator can add members
CREATE POLICY "Initiator can add members" 
  ON public.buddy_group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.buddy_groups
      WHERE id = buddy_group_id AND initiator_uid = auth.uid()
    )
  );

-- Users can update their own status (accept/decline)
CREATE POLICY "Users can update own status" 
  ON public.buddy_group_members
  FOR UPDATE
  TO authenticated
  USING (uid = auth.uid())
  WITH CHECK (uid = auth.uid());

-- Only initiator can delete members
CREATE POLICY "Initiator can delete members" 
  ON public.buddy_group_members
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.buddy_groups
      WHERE id = buddy_group_id AND initiator_uid = auth.uid()
    )
  );

-- Admins can do anything
CREATE POLICY "Admins full access to members" 
  ON public.buddy_group_members
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 8. Trigger to update updated_at
CREATE TRIGGER trg_buddy_groups_set_updated_at
  BEFORE UPDATE ON public.buddy_groups
  FOR EACH ROW
  EXECUTE FUNCTION public._set_updated_at();

-- 9. Helper function to get buddy group with members
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
LANGUAGE sql
SECURITY definer
AS $$
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
    AND bgm.status = 'accepted' -- Only include accepted members
  ORDER BY bg.id, bgm.invited_at;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_buddy_group_with_members(date, text, text) TO authenticated;

-- 10. Comments
COMMENT ON TABLE public.buddy_groups IS 'Tracks buddy dive/training groups where users can invite friends for pool or openwater sessions';
COMMENT ON TABLE public.buddy_group_members IS 'Members of buddy groups with acceptance status';
COMMENT ON COLUMN public.buddy_groups.res_type IS 'Type of reservation: pool or open_water';
COMMENT ON COLUMN public.buddy_group_members.status IS 'pending: invitation sent, accepted: confirmed buddy, declined: rejected invitation';
COMMENT ON COLUMN public.res_openwater.buddy_group_id IS 'Links reservation to a buddy group for group assignment';
COMMENT ON COLUMN public.res_pool.buddy_group_id IS 'Links reservation to a buddy group for lane assignment';
