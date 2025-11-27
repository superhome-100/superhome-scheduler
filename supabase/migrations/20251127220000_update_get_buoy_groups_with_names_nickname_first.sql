-- Migration: Update get_buoy_groups_with_names to prefer nickname over name
set search_path = public;

-- Drop the existing function definition to allow changing its body/OUT row
drop function if exists public.get_buoy_groups_with_names(date, varchar);

-- Recreate function with nickname-first member_names
create function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
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
    -- Prefer nickname, then name, for display
    array_agg(coalesce(up.nickname, up.name) order by coalesce(up.nickname, up.name)) as member_names
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat
  order by g.buoy_name asc, g.id asc;
end;
$$;

comment on function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
  is 'Returns buoy groups with member_uids and member_names, preferring user_profiles.nickname over name.';
