-- Maintain boat_count on buoy_group with special handling for Course/Coaching
-- Rule: For Course/Coaching, boat_count = 1 (instructor) + student_count.
--       For all other open water types, each reservation counts as 1.
-- Triggers keep boat_count in sync when res_openwater rows change group_id, open_water_type, or student_count.

set search_path = public;

-- 1) Add boat_count column
alter table if exists public.buoy_group
  add column if not exists boat_count integer;

-- 2) Helper to compute boat_count for a specific group
create or replace function public.compute_boat_count(p_group_id int)
returns integer
language sql
stable
as $$
  select coalesce(sum(
    case
      when coalesce(o.open_water_type, g.open_water_type) = 'Course/Coaching'
        then 1 + coalesce(o.student_count, 0)
      else 1
    end
  ), 0) as boat_count
  from public.res_openwater o
  join public.buoy_group g on g.id = p_group_id
  where o.group_id = p_group_id
$$;

-- 3) Procedure to refresh boat_count on buoy_group
create or replace function public.refresh_boat_count(p_group_id int)
returns void
language plpgsql
as $$
begin
  update public.buoy_group g
  set boat_count = public.compute_boat_count(g.id)
  where g.id = p_group_id;
end;
$$;

-- 4) Trigger to keep boat_count in sync when res_openwater changes
create or replace function public.trg_res_openwater_update_boat_count()
returns trigger
language plpgsql
as $$
begin
  -- On updates, refresh both old and new groups if group_id changed
  if tg_op = 'UPDATE' then
    if (old.group_id is not null) and (old.group_id is distinct from new.group_id) then
      perform public.refresh_boat_count(old.group_id);
    end if;
    if new.group_id is not null then
      perform public.refresh_boat_count(new.group_id);
    end if;
    return new;
  elsif tg_op = 'INSERT' then
    if new.group_id is not null then
      perform public.refresh_boat_count(new.group_id);
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.group_id is not null then
      perform public.refresh_boat_count(old.group_id);
    end if;
    return old;
  end if;
  return new;
end;
$$;

-- Drop and recreate trigger to capture inserts/updates affecting boat_count
-- Note: res_openwater already has triggers for capacity; this one is additional and cheap
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'tr_res_openwater_update_boat_count'
      AND n.nspname = 'public'
      AND c.relname = 'res_openwater'
  ) THEN
    EXECUTE 'drop trigger tr_res_openwater_update_boat_count on public.res_openwater';
  END IF;
END$$;

create trigger tr_res_openwater_update_boat_count
  after insert or update of group_id, open_water_type, student_count or delete
  on public.res_openwater
  for each row
  execute function public.trg_res_openwater_update_boat_count();

-- 5) Keep boat_count fresh when new groups are created (optional safety)
create or replace function public.trg_buoy_group_init_boat_count()
returns trigger
language plpgsql
as $$
begin
  -- initialize based on current memberships (likely 0 at creation)
  update public.buoy_group g
  set boat_count = public.compute_boat_count(new.id)
  where g.id = new.id;
  return new;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'tr_buoy_group_init_boat_count'
      AND n.nspname = 'public'
      AND c.relname = 'buoy_group'
  ) THEN
    EXECUTE 'drop trigger tr_buoy_group_init_boat_count on public.buoy_group';
  END IF;
END$$;

create trigger tr_buoy_group_init_boat_count
  after insert on public.buoy_group
  for each row
  execute function public.trg_buoy_group_init_boat_count();

-- Also refresh boat_count if group open_water_type is updated later
create or replace function public.trg_buoy_group_update_boat_count()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_boat_count(new.id);
  return new;
end;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'tr_buoy_group_update_boat_count'
      AND n.nspname = 'public'
      AND c.relname = 'buoy_group'
  ) THEN
    EXECUTE 'drop trigger tr_buoy_group_update_boat_count on public.buoy_group';
  END IF;
END$$;

create trigger tr_buoy_group_update_boat_count
  after update of open_water_type on public.buoy_group
  for each row
  execute function public.trg_buoy_group_update_boat_count();

-- 6) Update admin helper to include boat_count in output
-- There are multiple prior definitions; we must drop first to change return type
drop function if exists public.get_buoy_groups_with_names(date, varchar);
-- Then recreate with new return type including boat_count
create or replace function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
returns table (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  boat_count integer,
  open_water_type text,
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
    g.boat_count,
    g.open_water_type,
    array_agg(r.uid order by r.uid) as member_uids,
    array_agg(coalesce(up.name, 'Unknown Diver') order by up.name) as member_names
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.boat_count, g.open_water_type
  order by g.open_water_type asc nulls last, g.buoy_name asc, g.id asc;
end;
$$;

-- 7) Backfill boat_count for existing groups
update public.buoy_group g
set boat_count = public.compute_boat_count(g.id)
where boat_count is null;

-- Re-ensure execute privilege remains for authenticated
grant execute on function public.get_buoy_groups_with_names(date, varchar) to authenticated;
