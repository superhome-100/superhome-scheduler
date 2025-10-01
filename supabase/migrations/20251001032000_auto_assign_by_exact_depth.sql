-- Auto-assign: create groups of 3 by EXACT depth for the same date and time period
set search_path = public;

create or replace function public.auto_assign_buoy(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
declare
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  r_depth record;
  uids uuid[];
  l int;
  c int;
  chunk uuid[];
  v_group_id int;
  v_buoy_name varchar(64);
begin
  -- Admin check
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Iterate distinct exact depths among confirmed, unassigned reservations for day/period
  for r_depth in
    select o.depth_m
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date <  (p_res_date + 1)::timestamptz
      and not exists (
        select 1 from public.buoy_group_members m
        join public.buoy_group g on g.id = m.group_id
        where g.res_date = p_res_date
          and g.time_period = p_time_period
          and m.uid = o.uid
      )
    group by o.depth_m
    order by o.depth_m asc
  loop
    -- Collect all UIDs at this exact depth
    select array_agg(o.uid order by o.uid)
      into uids
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m = r_depth.depth_m
      and o.res_date >= p_res_date::timestamptz
      and o.res_date <  (p_res_date + 1)::timestamptz
      and not exists (
        select 1 from public.buoy_group_members m
        join public.buoy_group g on g.id = m.group_id
        where g.res_date = p_res_date
          and g.time_period = p_time_period
          and m.uid = o.uid
      );

    l := coalesce(array_length(uids,1), 0);
    while l > 0 loop
      c := least(3, l);
      chunk := uids[1:c];

      -- Pick buoy based on this exact depth
      v_buoy_name := public.find_best_buoy_for_depth(r_depth.depth_m);
      if v_buoy_name is null then
        v_skipped := v_skipped || jsonb_build_array(
          jsonb_build_object('reason', 'no_buoy_available', 'uids', chunk)
        );
      else
        insert into public.buoy_group(res_date, time_period, buoy_name)
        values (p_res_date, p_time_period, v_buoy_name)
        returning id into v_group_id;

        insert into public.buoy_group_members(group_id, uid)
        select v_group_id, m from unnest(chunk) as m;

        v_created_ids := v_created_ids || v_group_id;
      end if;

      if l > c then
        uids := uids[c+1:l];
      else
        uids := '{}';
      end if;
      l := coalesce(array_length(uids,1), 0);
    end loop;
  end loop;

  return json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;
