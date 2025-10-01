-- Auto-Assign Buoy schema and helpers
set search_path = public;

-- 1) buoy table
create table if not exists public.buoy (
  id serial primary key,
  buoy_name varchar(64) not null unique,
  max_depth integer not null check (max_depth > 0)
);

comment on table public.buoy is 'Buoy configuration, each row represents a depth band capability.';
comment on column public.buoy.buoy_name is 'Unique buoy display name';
comment on column public.buoy.max_depth is 'Maximum supported depth (meters)';

-- Seed default depth bands (idempotent upserts by name)
insert into public.buoy (buoy_name, max_depth) values
  ('Buoy 1', 15),
  ('Buoy 2', 30),
  ('Buoy 3', 45),
  ('Buoy 4', 60),
  ('Buoy 5', 75),
  ('Buoy 6', 90),
  ('Buoy 7', 105),
  ('Buoy 8', 120),
  ('Buoy 9', 135)
on conflict (buoy_name) do update set max_depth = excluded.max_depth;

-- 2) buoy_group table
-- Note: We keep res_date as DATE granularity for grouping by day/time period
-- and store diver ids as UUID[] matching our auth/user_profiles schema.
create table if not exists public.buoy_group (
  id serial primary key,
  note text,
  res_date date not null,
  time_period varchar(16) not null,
  buoy_name varchar(64) not null references public.buoy(buoy_name) on update cascade on delete restrict,
  boat varchar(32),
  diver_ids uuid[], -- up to 3 divers per group (enforced in application / admin UI)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists buoy_group_date_period_idx on public.buoy_group (res_date, time_period);
create index if not exists buoy_group_buoy_idx on public.buoy_group (buoy_name);

comment on table public.buoy_group is 'Admin-managed buoy groupings for Open Water per day/time period.';
comment on column public.buoy_group.time_period is 'AM/PM or custom period value from res_openwater.time_period';
comment on column public.buoy_group.diver_ids is 'UUIDs of divers assigned to this buoy group (max 3 recommended)';

-- 3) helper functions
create or replace function public.validate_depth_assignment(diver_depth integer, buoy_max_depth integer)
returns boolean
language plpgsql
as $$
begin
  return diver_depth <= buoy_max_depth;
end;
$$;

grant execute on function public.validate_depth_assignment(integer, integer) to authenticated;

create or replace function public.find_best_buoy_for_depth(target_depth integer)
returns varchar(64)
language plpgsql
as $$
declare
  best_buoy varchar(64);
begin
  select b.buoy_name into best_buoy
  from public.buoy b
  where b.max_depth >= target_depth
  order by b.max_depth asc
  limit 1;

  return best_buoy;
end;
$$;

grant execute on function public.find_best_buoy_for_depth(integer) to authenticated;

create or replace function public.check_buoy_capacity(p_buoy_name varchar(64), p_res_date date, p_time_period varchar(16))
returns integer
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
  from public.buoy_group g
  where g.buoy_name = p_buoy_name
    and g.res_date = p_res_date
    and g.time_period = p_time_period;

  return current_count;
end;
$$;

grant execute on function public.check_buoy_capacity(varchar, date, varchar) to authenticated;

create or replace function public.handle_odd_divers(diver_count integer, target_depth integer)
returns varchar(64)
language plpgsql
as $$
declare
  assigned_buoy varchar(64);
begin
  if diver_count = 1 then
    select b.buoy_name into assigned_buoy
    from public.buoy b
    where b.max_depth >= target_depth
    order by b.max_depth asc
    limit 1;
  elsif diver_count > 3 then
    select b.buoy_name into assigned_buoy
    from public.buoy b
    where b.max_depth >= target_depth
    order by b.max_depth desc
    limit 1;
  end if;

  return assigned_buoy;
end;
$$;

grant execute on function public.handle_odd_divers(integer, integer) to authenticated;

-- 4) RLS: Admin-only management by default
alter table public.buoy enable row level security;
alter table public.buoy_group enable row level security;

-- Policies for buoy (admin can do everything)
create policy buoy_admin_select_all on public.buoy for select using (public.is_admin());
create policy buoy_admin_insert_all on public.buoy for insert with check (public.is_admin());
create policy buoy_admin_update_all on public.buoy for update using (public.is_admin()) with check (public.is_admin());
create policy buoy_admin_delete_all on public.buoy for delete using (public.is_admin());

-- Policies for buoy_group (admin can do everything)
create policy buoy_group_admin_select_all on public.buoy_group for select using (public.is_admin());
create policy buoy_group_admin_insert_all on public.buoy_group for insert with check (public.is_admin());
create policy buoy_group_admin_update_all on public.buoy_group for update using (public.is_admin()) with check (public.is_admin());
create policy buoy_group_admin_delete_all on public.buoy_group for delete using (public.is_admin());

-- 5) Row modification timestamp maintenance
create or replace function public._set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_buoy_group_set_updated_at') then
    execute 'create trigger trg_buoy_group_set_updated_at before update on public.buoy_group for each row execute function public._set_updated_at()';
  end if;
end $$;
