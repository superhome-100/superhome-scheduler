-- Allow users to see pending Open Water reservations as well as confirmed
-- Keeps Pool/Classroom readable only when confirmed

set search_path = public;

begin;

-- 1) Update public read functions to include pending for Open Water
-- get_buoy_groups_public: include members whose parent reservation is confirmed or pending
create or replace function public.get_buoy_groups_public(
  p_res_date date,
  p_time_period varchar
)
returns table (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  member_uids uuid[],
  member_names text[],
  boat_count integer,
  open_water_type text,
  member_statuses text[]
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.res_date,
    g.time_period,
    g.buoy_name,
    g.boat,
    array_remove(array_agg(r.uid order by r.uid), null)::uuid[] as member_uids,
    array_remove(array_agg(coalesce(up.nickname, up.name) order by coalesce(up.nickname, up.name)), null)::text[] as member_names,
    coalesce(g.boat_count, count(r.uid))::integer as boat_count,
    g.open_water_type::text as open_water_type,
    array_remove(array_agg((rv.res_status)::text), null)::text[] as member_statuses
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
  left join public.user_profiles up on up.uid = r.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
    and rv.res_type = 'open_water'
    and rv.res_status in ('confirmed','pending')
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.boat_count, g.open_water_type
  order by g.buoy_name asc, g.id asc;
$$;

comment on function public.get_buoy_groups_public(date, varchar)
  is 'Public read function for buoy groups (Open Water) including pending and confirmed reservations.';

-- get_openwater_assignment_map: include pending
create or replace function public.get_openwater_assignment_map(
  p_res_date date
)
returns table (
  uid uuid,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  res_date date
)
language sql
security definer
set search_path = public
as $$
  select
    r.uid,
    r.time_period,
    bg.buoy_name,
    bg.boat,
    r.res_date::date
  from public.res_openwater r
  left join public.buoy_group bg on bg.id = r.group_id
  left join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
  where r.group_id is not null
    and r.res_date::date = p_res_date
    and rv.res_type = 'open_water'
    and rv.res_status in ('confirmed','pending');
$$;

comment on function public.get_openwater_assignment_map(date)
  is 'Public read function for open water assignment map, including pending and confirmed.';

-- 2) RLS policies adjustments for Open Water to include pending
-- reservations: add a policy to allow select of open water pending (in addition to confirmed policy)
drop policy if exists reservations_select_openwater_pending_for_all on public.reservations;
create policy reservations_select_openwater_pending_for_all
  on public.reservations
  for select
  to authenticated
  using (res_type = 'open_water' and res_status in ('confirmed','pending'));

-- res_openwater: allow select if parent reservation is open_water and pending/confirmed
drop policy if exists res_openwater_select_if_parent_openwater_pending_or_confirmed on public.res_openwater;
create policy res_openwater_select_if_parent_openwater_pending_or_confirmed
  on public.res_openwater
  for select
  to authenticated
  using (exists (
    select 1 from public.reservations rv
    where rv.uid = res_openwater.uid
      and rv.res_date = res_openwater.res_date
      and rv.res_type = 'open_water'
      and rv.res_status in ('confirmed','pending')
  ));

-- buoy_group: allow select if any linked member has open_water pending/confirmed
drop policy if exists buoy_group_select_if_any_openwater_pending_or_confirmed on public.buoy_group;
create policy buoy_group_select_if_any_openwater_pending_or_confirmed
  on public.buoy_group
  for select
  to authenticated
  using (exists (
    select 1 from public.res_openwater r
    join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
    where r.group_id = buoy_group.id
      and rv.res_type = 'open_water'
      and rv.res_status in ('confirmed','pending')
  ));

commit;
