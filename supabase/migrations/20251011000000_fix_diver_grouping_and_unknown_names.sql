-- Fix diver grouping and unknown names issues
-- This migration fixes the auto-assign buoy function to properly group divers by depth proximity
-- and ensures diver names are properly displayed

set search_path = public;

-- 1) Fix the auto_assign_buoy function to properly group divers by depth proximity (≤15m difference)
-- and ensure maximum 3 divers per group, following the prev_app logic
create or replace function public.auto_assign_buoy(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
declare
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_reservation record;
  v_buoy_name varchar;
  v_group_id int;
  v_group_depths int[] := '{}';
  v_group_uids uuid[] := '{}';
  v_max_depth int;
  v_depth_diff int;
  v_group_size int;
begin
  -- Only admins can run this RPC
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Clear existing groups for this date/period first
  update public.res_openwater
  set group_id = null
  where res_date >= p_res_date::timestamptz
    and res_date < (p_res_date + 1)::timestamptz
    and time_period = p_time_period;

  delete from public.buoy_group
  where res_date = p_res_date
    and time_period = p_time_period;

  -- Get all confirmed, unassigned open-water reservations for the date/period
  -- Sort by depth to enable proper grouping
  for v_reservation in
    select o.uid, o.depth_m
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date < (p_res_date + 1)::timestamptz
    order by o.depth_m asc
  loop
    -- If we have no group yet, start a new one
    if array_length(v_group_uids, 1) is null then
      v_group_uids := array[v_reservation.uid];
      v_group_depths := array[v_reservation.depth_m];
    else
      -- Check if we can add this diver to the current group
      v_group_size := array_length(v_group_uids, 1);
      v_max_depth := (select max(d) from unnest(v_group_depths) as d);
      v_depth_diff := abs(v_reservation.depth_m - v_max_depth);
      
      -- Add to current group if:
      -- 1. Group has less than 3 divers AND
      -- 2. Depth difference is ≤15m OR group has only 1 diver (to avoid orphans)
      if v_group_size < 3 and (v_depth_diff <= 15 or v_group_size = 1) then
        v_group_uids := v_group_uids || v_reservation.uid;
        v_group_depths := v_group_depths || v_reservation.depth_m;
      else
        -- Process the current group first
        perform public._process_buoy_group(
          p_res_date, p_time_period, v_group_uids, v_group_depths, v_created_ids, v_skipped
        );
        
        -- Start a new group with this diver
        v_group_uids := array[v_reservation.uid];
        v_group_depths := array[v_reservation.depth_m];
      end if;
    end if;
  end loop;

  -- Process the last group if it exists
  if array_length(v_group_uids, 1) is not null then
    perform public._process_buoy_group(
      p_res_date, p_time_period, v_group_uids, v_group_depths, v_created_ids, v_skipped
    );
  end if;

  return json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'::int[]), 
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
end;
$$;

-- 2) Create helper function to process a group of divers
create or replace function public._process_buoy_group(
  p_res_date date,
  p_time_period varchar,
  p_group_uids uuid[],
  p_group_depths int[],
  inout p_created_ids int[],
  inout p_skipped jsonb
)
language plpgsql
security definer
as $$
declare
  v_buoy_name varchar;
  v_group_id int;
  v_max_depth int;
  v_uid uuid;
begin
  -- Skip empty groups
  if array_length(p_group_uids, 1) is null or array_length(p_group_uids, 1) = 0 then
    return;
  end if;

  -- Find the maximum depth in the group
  v_max_depth := (select max(d) from unnest(p_group_depths) as d);
  
  -- Pick the smallest buoy that can accommodate the group's max depth
  select b.buoy_name into v_buoy_name
  from public.buoy b
  where b.max_depth >= v_max_depth
  order by b.max_depth asc
  limit 1;

  if v_buoy_name is null then
    p_skipped := p_skipped || jsonb_build_object(
      'reason', 'no_buoy_available', 
      'uids', to_jsonb(p_group_uids)
    );
    return;
  end if;

  -- Create a new group
  insert into public.buoy_group(res_date, time_period, buoy_name)
  values (p_res_date, p_time_period, v_buoy_name)
  returning id into v_group_id;

  -- Assign all divers in the group to this buoy group
  foreach v_uid in array p_group_uids
  loop
    update public.res_openwater
    set group_id = v_group_id
    where uid = v_uid
      and res_date >= p_res_date::timestamptz
      and res_date < (p_res_date + 1)::timestamptz
      and time_period = p_time_period;
  end loop;

  p_created_ids := p_created_ids || v_group_id;
end;
$$;

-- 3) Fix the get_buoy_groups_with_names function to handle null names properly
create or replace function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
returns table (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  member_uids uuid[],
  member_names text[]
)
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.res_date,
    g.time_period,
    g.buoy_name,
    g.boat,
    array_agg(r.uid order by r.uid) as member_uids,
    array_agg(coalesce(up.name, 'Unknown Diver') order by up.name) as member_names
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat
  order by g.buoy_name asc, g.id asc;
end;
$$;

-- 4) Update the Edge Function auto-assign-buoy to use the fixed RPC function
-- This ensures consistency between Edge Function and RPC implementations
create or replace function public.auto_assign_buoy_edge_function(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
begin
  -- Simply call the main auto_assign_buoy function
  return public.auto_assign_buoy(p_res_date, p_time_period);
end;
$$;

grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;
grant execute on function public.auto_assign_buoy_edge_function(date, varchar) to authenticated;
grant execute on function public._process_buoy_group(date, varchar, uuid[], int[], int[], jsonb) to authenticated;
