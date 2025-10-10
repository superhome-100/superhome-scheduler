-- Exclude Course/Coaching from grouping; still assign buoy/boat by creating a dedicated group per reservation
set search_path = public;

-- Recreate auto_assign_buoy to special-case Course/Coaching as single-member groups
create or replace function public.auto_assign_buoy(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
declare
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  v_reservation record;
  v_group_uids uuid[] := '{}';
  v_group_depths int[] := '{}';
  v_group_ow_type text := null;
  v_group_size int;
  v_max_depth int;
  v_depth_diff int;
begin
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

  -- Iterate reservations sorted by type then depth
  for v_reservation in
    select o.uid, o.depth_m, o.open_water_type
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.open_water_type is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date < (p_res_date + 1)::timestamptz
    order by o.open_water_type asc, o.depth_m asc
  loop
    -- Special-case: Course/Coaching should never be grouped with others
    if v_reservation.open_water_type = 'Course/Coaching' then
      -- Flush any ongoing non-course group first
      if array_length(v_group_uids, 1) is not null then
        perform public._process_buoy_group(
          p_res_date, p_time_period, v_group_ow_type, v_group_uids, v_group_depths, v_created_ids, v_skipped
        );
        v_group_uids := '{}';
        v_group_depths := '{}';
        v_group_ow_type := null;
      end if;

      -- Process this reservation as a single-member group
      perform public._process_buoy_group(
        p_res_date, p_time_period, v_reservation.open_water_type,
        array[v_reservation.uid], array[v_reservation.depth_m], v_created_ids, v_skipped
      );
    else
      if array_length(v_group_uids, 1) is null then
        -- start new group
        v_group_uids := array[v_reservation.uid];
        v_group_depths := array[v_reservation.depth_m];
        v_group_ow_type := v_reservation.open_water_type;
      else
        v_group_size := array_length(v_group_uids, 1);
        v_max_depth := (select max(d) from unnest(v_group_depths) as d);
        v_depth_diff := abs(v_reservation.depth_m - v_max_depth);

        -- If type changed OR cannot fit by depth/size, flush and start new group
        if v_reservation.open_water_type is distinct from v_group_ow_type
           or not (v_group_size < 3 and (v_depth_diff <= 15 or v_group_size = 1)) then
          perform public._process_buoy_group(
            p_res_date, p_time_period, v_group_ow_type, v_group_uids, v_group_depths, v_created_ids, v_skipped
          );
          v_group_uids := array[v_reservation.uid];
          v_group_depths := array[v_reservation.depth_m];
          v_group_ow_type := v_reservation.open_water_type;
        else
          -- add to current group
          v_group_uids := v_group_uids || v_reservation.uid;
          v_group_depths := v_group_depths || v_reservation.depth_m;
        end if;
      end if;
    end if;
  end loop;

  -- flush last non-course group
  if array_length(v_group_uids, 1) is not null then
    perform public._process_buoy_group(
      p_res_date, p_time_period, v_group_ow_type, v_group_uids, v_group_depths, v_created_ids, v_skipped
    );
  end if;

  return json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'::int[]),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
end;
$$;

-- Ensure execute privileges remain
grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;
