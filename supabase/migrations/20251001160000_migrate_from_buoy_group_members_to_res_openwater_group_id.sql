-- Migrate from buoy_group_members to res_openwater.group_id
-- This migration eliminates the buoy_group_members table and uses res_openwater.group_id instead
set search_path = public;

-- 1) Update get_my_buoy_assignment function to use res_openwater.group_id
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
  join public.res_openwater r on r.group_id = g.id
  where g.res_date = p_res_date
    and g.time_period = p_time_period
    and r.uid = auth.uid()
  limit 1;
$$;

-- 2) Update get_buoy_groups_with_names function to use res_openwater.group_id
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
    array_agg(r.uid order by r.uid) as member_uids,
    array_agg(up.name order by up.name) as member_names
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat
  order by g.buoy_name asc, g.id asc;
end;
$$;

-- 3) Update auto_assign_buoy function to work with res_openwater.group_id
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
  v_group_count int;
  v_existing_group_id int;
begin
  -- Get all confirmed open water reservations for the date and time period
  for v_reservation in
    select r.uid, r.depth_m, up.name as user_name
    from public.res_openwater r
    join public.user_profiles up on up.uid = r.uid
    where date(r.res_date) = p_res_date
      and r.time_period = p_time_period
      and r.res_status = 'confirmed'
      and r.depth_m is not null
      and r.group_id is null
    order by r.depth_m asc
  loop
    -- Find the best buoy for this depth
    select buoy_name into v_buoy_name
    from public.buoy
    where max_depth >= v_reservation.depth_m
    order by max_depth asc
    limit 1;
    
    if v_buoy_name is null then
      v_skipped := v_skipped || jsonb_build_object(
        'reason', 'no_buoy_available',
        'uids', jsonb_build_array(v_reservation.uid)
      );
      continue;
    end if;
    
    -- Check if there's an existing group with space (max 3 per group)
    select bg.id, count(r2.uid) into v_existing_group_id, v_group_count
    from public.buoy_group bg
    left join public.res_openwater r2 on r2.group_id = bg.id
    where bg.res_date = p_res_date
      and bg.time_period = p_time_period
      and bg.buoy_name = v_buoy_name
    group by bg.id
    having count(r2.uid) < 3
    order by count(r2.uid) desc
    limit 1;
    
    if v_existing_group_id is not null then
      -- Add to existing group
      update public.res_openwater
      set group_id = v_existing_group_id
      where uid = v_reservation.uid
        and res_date = (p_res_date::text || ' 00:00:00')::timestamptz
        and time_period = p_time_period;
    else
      -- Create new group
      insert into public.buoy_group (res_date, time_period, buoy_name)
      values (p_res_date, p_time_period, v_buoy_name)
      returning id into v_group_id;
      
      -- Add reservation to new group
      update public.res_openwater
      set group_id = v_group_id
      where uid = v_reservation.uid
        and res_date = (p_res_date::text || ' 00:00:00')::timestamptz
        and time_period = p_time_period;
      
      v_created_ids := v_created_ids || v_group_id;
    end if;
  end loop;
  
  return json_build_object(
    'createdGroupIds', v_created_ids,
    'skipped', v_skipped
  );
end;
$$;

-- 4) Create a function to get group members using res_openwater.group_id
create or replace function public.get_group_members(p_group_id integer)
returns table (
  uid uuid,
  user_name text,
  depth_m integer
)
language sql
security definer
as $$
  select r.uid, up.name, r.depth_m
  from public.res_openwater r
  join public.user_profiles up on up.uid = r.uid
  where r.group_id = p_group_id
  order by r.depth_m asc;
$$;

-- 5) Create a function to check group capacity using res_openwater.group_id
create or replace function public.check_group_capacity(p_group_id integer)
returns integer
language sql
security definer
as $$
  select count(*)
  from public.res_openwater
  where group_id = p_group_id;
$$;

-- 6) Drop the old trigger and function that enforced max 3 members
drop trigger if exists trg_buoy_group_members_limit on public.buoy_group_members;
drop function if exists public._enforce_max_three_members();

-- 7) Create new trigger to enforce max 3 members per group using res_openwater
create or replace function public._enforce_max_three_members_res_openwater()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.res_openwater r where r.group_id = new.group_id
  ) >= 3 then
    raise exception 'buoy_group % already has 3 members', new.group_id using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 8) Create trigger on res_openwater to enforce max 3 members per group
create trigger trg_res_openwater_group_limit
  before insert or update on public.res_openwater
  for each row
  when (new.group_id is not null)
  execute function public._enforce_max_three_members_res_openwater();

-- 9) Drop RLS policies on buoy_group_members (will be dropped with table)
drop policy if exists buoy_group_members_admin_select_all on public.buoy_group_members;
drop policy if exists buoy_group_members_admin_insert_all on public.buoy_group_members;
drop policy if exists buoy_group_members_admin_update_all on public.buoy_group_members;
drop policy if exists buoy_group_members_admin_delete_all on public.buoy_group_members;

-- 10) Drop the buoy_group_members table
drop table if exists public.buoy_group_members;

-- 11) Add comment to res_openwater.group_id
comment on column public.res_openwater.group_id is 'Foreign key to buoy_group.id - links reservation to assigned buoy group. Enforces max 3 members per group via trigger.';
