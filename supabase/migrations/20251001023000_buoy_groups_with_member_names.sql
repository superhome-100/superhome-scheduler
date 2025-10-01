-- RPC to fetch buoy groups with member names for a given day and time period
set search_path = public;

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
    array_agg(m.uid order by m.uid) as member_uids,
    array_agg(up.name order by up.name) as member_names
  from public.buoy_group g
  left join public.buoy_group_members m on m.group_id = g.id
  left join public.user_profiles up on up.uid = m.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat
  order by g.buoy_name asc, g.id asc;
end;
$$;

grant execute on function public.get_buoy_groups_with_names(date, varchar) to authenticated;
