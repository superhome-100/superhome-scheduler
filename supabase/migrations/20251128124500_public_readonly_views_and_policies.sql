-- Read-only access for users to view daily reservations and open water tables
-- Creates SECURITY DEFINER functions for safe reads and SELECT policies for confirmed reservations

set search_path = public;

begin;

-- 1) Public function: buoy groups with member names (nickname first) for a given date+period
--    Only exposes safe fields: buoy_name, boat, member_names, member_uids, boat_count, open_water_type
--    SECURITY DEFINER to bypass RLS on user_profiles/reservations while not exposing sensitive columns.
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
    -- Prefer precomputed boat_count if present on group; else count non-null members
    coalesce(g.boat_count, count(r.uid))::integer as boat_count,
    g.open_water_type::text as open_water_type,
    array_remove(array_agg((r.res_status)::text), null)::text[] as member_statuses
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  left join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
  where g.res_date = p_res_date
    and g.time_period = p_time_period
    -- Only include rows tied to confirmed reservations for non-admin public view
    and (rv.res_status = 'confirmed')
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.boat_count, g.open_water_type
  order by g.buoy_name asc, g.id asc;
$$;

comment on function public.get_buoy_groups_public(date, varchar)
  is 'Public read function for buoy groups with member names (nickname first), only for confirmed reservations.';

-- 2) Public function: per-user assignment map for a given date
--    Returns uid -> time_period -> (buoy_name, boat)
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
    and rv.res_status = 'confirmed';
$$;

comment on function public.get_openwater_assignment_map(date)
  is 'Public read function for open water assignment map (uid, period -> buoy/boat) for confirmed reservations on a given date.';

-- 3) SELECT policies to allow authenticated users to read safe data directly when needed
--    We restrict to confirmed reservations to avoid exposing tentative data.

-- Ensure RLS enabled on target tables (no-op if already enabled)
alter table if exists public.reservations enable row level security;
alter table if exists public.res_openwater enable row level security;
alter table if exists public.res_pool enable row level security;
alter table if exists public.res_classroom enable row level security;
alter table if exists public.buoy_group enable row level security;
alter table if exists public.buoy enable row level security;

-- reservations: allow select of confirmed rows
drop policy if exists reservations_select_confirmed_for_all on public.reservations;
create policy reservations_select_confirmed_for_all
  on public.reservations
  for select
  to authenticated
  using (res_status = 'confirmed');

-- res_openwater: allow select if parent reservation confirmed
drop policy if exists res_openwater_select_if_parent_confirmed on public.res_openwater;
create policy res_openwater_select_if_parent_confirmed
  on public.res_openwater
  for select
  to authenticated
  using (exists (
    select 1 from public.reservations rv
    where rv.uid = res_openwater.uid
      and rv.res_date = res_openwater.res_date
      and rv.res_status = 'confirmed'
  ));

-- res_pool: allow select if parent reservation confirmed
drop policy if exists res_pool_select_if_parent_confirmed on public.res_pool;
create policy res_pool_select_if_parent_confirmed
  on public.res_pool
  for select
  to authenticated
  using (exists (
    select 1 from public.reservations rv
    where rv.uid = res_pool.uid
      and rv.res_date = res_pool.res_date
      and rv.res_status = 'confirmed'
  ));

-- res_classroom: allow select if parent reservation confirmed
drop policy if exists res_classroom_select_if_parent_confirmed on public.res_classroom;
create policy res_classroom_select_if_parent_confirmed
  on public.res_classroom
  for select
  to authenticated
  using (exists (
    select 1 from public.reservations rv
    where rv.uid = res_classroom.uid
      and rv.res_date = res_classroom.res_date
      and rv.res_status = 'confirmed'
  ));

-- buoy_group: allow select if at least one confirmed reservation is linked
drop policy if exists buoy_group_select_if_any_confirmed_member on public.buoy_group;
create policy buoy_group_select_if_any_confirmed_member
  on public.buoy_group
  for select
  to authenticated
  using (exists (
    select 1 from public.res_openwater r
    join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
    where r.group_id = buoy_group.id
      and rv.res_status = 'confirmed'
  ));

-- buoy: allow select for authenticated (non-sensitive reference data)
drop policy if exists buoy_select_all on public.buoy;
create policy buoy_select_all
  on public.buoy
  for select
  to authenticated
  using (true);

commit;
