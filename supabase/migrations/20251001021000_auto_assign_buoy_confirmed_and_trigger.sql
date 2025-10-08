-- Update auto-assign to use confirmed reservations and avoid re-assigning
set search_path = public;

-- 1) Replace RPC to use confirmed and exclude already assigned members for that day/period
create or replace function public.auto_assign_buoy(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
declare
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  r_row record;
  v_group_id int;
  v_buoy_name varchar(64);
  v_member_count int;
begin
  -- Admin check
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Assign each confirmed, unassigned diver individually
  for r_row in
    select o.uid, o.depth_m
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where r.res_status = 'confirmed'
      and r.res_type = 'open_water'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date <  (p_res_date + 1)::timestamptz
      and not exists (
        select 1
        from public.buoy_group_members m
        join public.buoy_group g on g.id = m.group_id
        where g.res_date = p_res_date
          and g.time_period = p_time_period
          and m.uid = o.uid
      )
    order by o.depth_m asc
  loop
    -- Choose target buoy for this diver
    v_buoy_name := public.find_best_buoy_for_depth(r_row.depth_m);

    if v_buoy_name is null then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('reason', 'no_buoy_available', 'uids', array[r_row.uid])
      );
      continue;
    end if;

    -- Try to find an existing group for this date/period/buoy with available capacity (<3)
    select g.id into v_group_id
    from public.buoy_group g
    left join public.buoy_group_members m on m.group_id = g.id
    where g.res_date = p_res_date
      and g.time_period = p_time_period
      and g.buoy_name = v_buoy_name
    group by g.id
    having count(m.uid) < 3
    order by g.id asc
    limit 1;

    if v_group_id is null then
      insert into public.buoy_group(res_date, time_period, buoy_name)
      values (p_res_date, p_time_period, v_buoy_name)
      returning id into v_group_id;
      v_created_ids := v_created_ids || v_group_id;
    end if;

    -- Insert this diver into the chosen group (trigger enforces max 3)
    insert into public.buoy_group_members(group_id, uid)
    values (v_group_id, r_row.uid)
    on conflict do nothing;
  end loop;

  return json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;

-- 2) Trigger: after reservation is confirmed for open_water, auto-assign for that day & period
create or replace function public._trg_after_reservation_confirmed_auto_buoy()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.res_type = 'open_water' and new.res_status = 'confirmed' then
    -- get time period from res_openwater
    perform public.auto_assign_buoy(new.res_date::date,
      (select o.time_period from public.res_openwater o where o.uid = new.uid and o.res_date = new.res_date)
    );
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_after_reservation_confirmed_auto_buoy') then
    execute 'drop trigger trg_after_reservation_confirmed_auto_buoy on public.reservations';
  end if;
  execute 'create trigger trg_after_reservation_confirmed_auto_buoy after update of res_status on public.reservations for each row execute function public._trg_after_reservation_confirmed_auto_buoy()';
end $$;
