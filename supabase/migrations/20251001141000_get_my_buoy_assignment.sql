-- User-safe RPC to fetch the current user's buoy/boat assignment for a given day and time period
set search_path = public;

create or replace function public.get_my_buoy_assignment(p_res_date date, p_time_period varchar)
returns table (
  buoy_name varchar,
  boat varchar
)
language sql
security definer
set search_path = public
as $$
  select g.buoy_name, g.boat
  from public.buoy_group g
  join public.buoy_group_members m on m.group_id = g.id
  where g.res_date = p_res_date
    and g.time_period = p_time_period
    and m.uid = auth.uid()
  limit 1;
$$;

grant execute on function public.get_my_buoy_assignment(date, varchar) to authenticated;
