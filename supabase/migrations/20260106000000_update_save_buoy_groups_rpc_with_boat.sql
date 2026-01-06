-- Update buoy_group_input type to include boat
alter type public.buoy_group_input add attribute boat varchar(32);

-- Update _save_buoy_groups function to handle boat
create or replace function public._save_buoy_groups(
  p_res_date date,
  p_time_period varchar,
  p_groups public.buoy_group_input[]
)
returns void
language plpgsql
security definer
as $$
declare
  v_group public.buoy_group_input;
  v_group_id int;
  v_uid uuid;
begin
  -- 1. Clear existing groups for this date/period
  -- Reset group_id in res_openwater
  update public.res_openwater
  set group_id = null
  where res_date >= p_res_date::timestamptz
    and res_date < (p_res_date + 1)::timestamptz
    and time_period = p_time_period;

  -- Delete from buoy_group
  delete from public.buoy_group
  where res_date = p_res_date
    and time_period = p_time_period;

  -- 2. Insert new groups
  if p_groups is not null then
    foreach v_group in array p_groups
    loop
      -- Create group
      insert into public.buoy_group(res_date, time_period, buoy_name, open_water_type, boat)
      values (p_res_date, p_time_period, v_group.buoy_name, v_group.open_water_type, v_group.boat)
      returning id into v_group_id;

      -- Assign members
      if v_group.uids is not null then
        foreach v_uid in array v_group.uids
        loop
          update public.res_openwater
          set group_id = v_group_id
          where uid = v_uid
            and res_date >= p_res_date::timestamptz
            and res_date < (p_res_date + 1)::timestamptz
            and time_period = p_time_period;
        end loop;
      end if;
    end loop;
  end if;
end;
$$;
