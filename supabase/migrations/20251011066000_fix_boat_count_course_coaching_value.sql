-- Fix boat_count calculation to use correct open_water_type value for course_coaching
-- The previous migration used 'Course/Coaching' but the actual enum value is 'course_coaching'
set search_path = public;

-- Update the compute_boat_count function to use the correct enum value
create or replace function public.compute_boat_count(p_group_id int)
returns integer
language sql
stable
as $$
  select coalesce(sum(
    case
      when coalesce(o.open_water_type, g.open_water_type) = 'course_coaching'
        then 1 + coalesce(o.student_count, 0)
      else 1
    end
  ), 0) as boat_count
  from public.res_openwater o
  join public.buoy_group g on g.id = p_group_id
  where o.group_id = p_group_id
$$;

-- Recompute boat_count for all existing groups to ensure correct values
update public.buoy_group g
set boat_count = public.compute_boat_count(g.id)
where g.open_water_type = 'course_coaching' or g.id in (
  select distinct group_id 
  from public.res_openwater 
  where open_water_type = 'course_coaching' 
    and group_id is not null
);

-- Debug: Show the corrected boat counts for course_coaching groups
DO $$
DECLARE
  v_count int;
  v_groups text;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.buoy_group 
  WHERE open_water_type = 'course_coaching' 
    AND boat_count > 0;
  
  RAISE NOTICE 'Course/Coaching groups with boat_count > 0: %', v_count;
  
  -- Show some examples
  SELECT string_agg(
    'Group ' || id || ': boat_count=' || boat_count || ' (open_water_type=' || open_water_type || ')', 
    ', '
  ) INTO v_groups
  FROM public.buoy_group 
  WHERE open_water_type = 'course_coaching' 
    AND boat_count > 0
  LIMIT 5;
  
  RAISE NOTICE 'Examples: %', v_groups;
END $$;
