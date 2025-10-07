-- Fix auto_assign_buoy signature to accept text and correct body to use res_openwater.group_id
set search_path = public;

-- 1) Correct main implementation (date, varchar)
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
  v_existing_group_id int;
begin
  -- Only admins can run this RPC
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Iterate confirmed, unassigned open-water reservations for the date/period
  for v_reservation in
    select o.uid, o.depth_m
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date <  (p_res_date + 1)::timestamptz
      and o.group_id is null
    order by o.depth_m asc
  loop
    -- Pick the smallest buoy that can accommodate the diver's depth
    select b.buoy_name into v_buoy_name
    from public.buoy b
    where b.max_depth >= v_reservation.depth_m
    order by b.max_depth asc
    limit 1;

    if v_buoy_name is null then
      v_skipped := v_skipped || jsonb_build_array(jsonb_build_object('reason','no_buoy_available','uids', array[v_reservation.uid]));
      continue;
    end if;

    -- Try to find existing group with capacity (<3)
    select g.id into v_existing_group_id
    from public.buoy_group g
    left join public.res_openwater ro on ro.group_id = g.id
    where g.res_date = p_res_date
      and g.time_period = p_time_period
      and g.buoy_name = v_buoy_name
    group by g.id
    having count(ro.uid) < 3
    order by g.id asc
    limit 1;

    if v_existing_group_id is not null then
      -- Assign to existing group
      update public.res_openwater
      set group_id = v_existing_group_id
      where uid = v_reservation.uid
        and res_date >= p_res_date::timestamptz
        and res_date <  (p_res_date + 1)::timestamptz
        and time_period = p_time_period;
    else
      -- Create a new group, then assign
      insert into public.buoy_group(res_date, time_period, buoy_name)
      values (p_res_date, p_time_period, v_buoy_name)
      returning id into v_group_id;

      update public.res_openwater
      set group_id = v_group_id
      where uid = v_reservation.uid
        and res_date >= p_res_date::timestamptz
        and res_date <  (p_res_date + 1)::timestamptz
        and time_period = p_time_period;

      v_created_ids := v_created_ids || v_group_id;
    end if;
  end loop;

  return json_build_object('createdGroupIds', coalesce(v_created_ids,'{}'::int[]), 'skipped', coalesce(v_skipped,'[]'::jsonb));
end;
$$;

grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;

-- 2) Overload wrapper (date, text) to avoid arg cast issues from callers using text
create or replace function public.auto_assign_buoy(p_res_date date, p_time_period text)
returns json
language plpgsql
security definer
as $$
begin
  return public.auto_assign_buoy(p_res_date, p_time_period::varchar);
end;
$$;

grant execute on function public.auto_assign_buoy(date, text) to authenticated;
