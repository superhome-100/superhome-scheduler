-- Backfill open_water_type in buoy_group from res_openwater.open_water_type
set search_path = public;

-- Debug: Show current state before backfill
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.buoy_group WHERE open_water_type IS NULL;
  RAISE NOTICE 'Groups with NULL open_water_type before backfill: %', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.res_openwater WHERE open_water_type IS NOT NULL;
  RAISE NOTICE 'res_openwater records with open_water_type: %', v_count;
END $$;

-- Update existing buoy_group records to have open_water_type populated
-- Use the open_water_type from the first member of each group
update public.buoy_group g
set open_water_type = (
  select distinct o.open_water_type
  from public.res_openwater o
  where o.group_id = g.id
    and o.open_water_type is not null
  limit 1
)
where g.open_water_type is null
  and exists (
    select 1 from public.res_openwater o
    where o.group_id = g.id
      and o.open_water_type is not null
  );

-- For groups where all members have null open_water_type, set a default
-- This handles edge cases where the data might be inconsistent
update public.buoy_group g
set open_water_type = 'Course/Coaching'
where g.open_water_type is null
  and exists (
    select 1 from public.res_openwater o
    where o.group_id = g.id
  );

-- Debug: Show state after backfill
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.buoy_group WHERE open_water_type IS NULL;
  RAISE NOTICE 'Groups with NULL open_water_type after backfill: %', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.buoy_group WHERE open_water_type IS NOT NULL;
  RAISE NOTICE 'Groups with populated open_water_type: %', v_count;
END $$;

-- Add a comment explaining the backfill
comment on column public.buoy_group.open_water_type is 'Open water type for this group, populated from res_openwater.open_water_type of group members';
