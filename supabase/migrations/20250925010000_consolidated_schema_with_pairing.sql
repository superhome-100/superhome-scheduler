-- Consolidated migration: Core tables, RLS policies, auto-pairing, and RPC functions
-- Combines functionality from:
-- - 20250924195719_create_core_tables_and_policies.sql
-- - 20250924230213_depth_only_openwater_pairing.sql  
-- - 20250924234500_openwater_pair_info_rpc.sql
-- - 20250925001500_user_profiles_select_when_paired.sql
set search_path = public;

-- 0) Enum types for strictness (implementation detail; plan used text)
create type public.user_status as enum ('active', 'disabled');
create type public.reservation_status as enum ('pending', 'confirmed', 'rejected');
create type public.reservation_type as enum ('pool', 'open_water', 'classroom');

-- 1) user_profiles
create table if not exists public.user_profiles (
  uid uuid primary key references auth.users (id) on delete cascade,
  name text,
  status public.user_status not null default 'active',
  privileges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.user_profiles is 'Profile info for each authenticated user. PK uid references auth.users(id).';
comment on column public.user_profiles.uid is 'PK, equivalent to Auth login user ID';
comment on column public.user_profiles.name is 'Full name of the user';
comment on column public.user_profiles.status is 'User status: active or disabled';
comment on column public.user_profiles.privileges is 'Array of privileges/roles associated with user (e.g., admin, user)';

-- 2) reservations (parent)
create table if not exists public.reservations (
  uid uuid not null references public.user_profiles (uid) on delete cascade,
  res_date timestamptz not null,
  res_type public.reservation_type not null,
  res_status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (uid, res_date)
);

comment on table public.reservations is 'Reservations made by users';
comment on column public.reservations.uid is 'FK: references user_profiles.uid';
comment on column public.reservations.res_date is 'The date and time of the reservation';
comment on column public.reservations.res_type is 'Type of reservation: pool, open_water, classroom';
comment on column public.reservations.res_status is 'Reservation status: pending, confirmed, or rejected';

-- Helpful indexes
create index if not exists reservations_uid_idx on public.reservations (uid);
create index if not exists reservations_res_date_idx on public.reservations (res_date);

-- 3) Per-type detail tables (1-1 with reservations via (uid,res_date))
create table if not exists public.res_pool (
  uid uuid not null,
  res_date timestamptz not null,
  res_status public.reservation_status not null default 'pending',
  start_time time,
  end_time time,
  lane text,
  note text,
  primary key (uid, res_date),
  foreign key (uid, res_date) references public.reservations(uid, res_date) on delete cascade
);

create table if not exists public.res_openwater (
  uid uuid not null,
  res_date timestamptz not null,
  res_status public.reservation_status not null default 'pending',
  time_period text,
  depth_m integer check (depth_m is null or depth_m > 0),
  buoy text,
  auto_adjust_closest boolean not null default false,
  paired_uid uuid references public.user_profiles(uid),
  paired_at timestamptz,
  pulley boolean not null default false,
  bottom_plate boolean not null default false,
  large_buoy boolean not null default false,
  note text,
  primary key (uid, res_date),
  foreign key (uid, res_date) references public.reservations(uid, res_date) on delete cascade
);

create index if not exists res_openwater_date_depth_idx on public.res_openwater (res_date, depth_m);
create index if not exists res_openwater_paired_uid_idx on public.res_openwater (paired_uid);

create table if not exists public.res_classroom (
  uid uuid not null,
  res_date timestamptz not null,
  res_status public.reservation_status not null default 'pending',
  start_time time,
  end_time time,
  room text,
  note text,
  primary key (uid, res_date),
  foreign key (uid, res_date) references public.reservations(uid, res_date) on delete cascade
);

-- 4) RLS enablement
alter table public.user_profiles enable row level security;
alter table public.reservations enable row level security;
alter table public.res_pool enable row level security;
alter table public.res_openwater enable row level security;
alter table public.res_classroom enable row level security;

-- 5) Helper: admin check based on privileges array
create or replace function public.is_admin()
returns boolean
language sql
security definer
as $$
  select exists (
    select 1 from public.user_profiles 
    where uid = auth.uid() 
      and 'admin' = any(privileges)
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- 6) Ownership helper for child tables
create or replace function public._owns_reservation(_uid uuid, _res_date timestamptz)
returns boolean
language sql stable
as $$
  select exists (
    select 1 from public.reservations r
    where r.uid = auth.uid()
      and r.uid = _uid
      and r.res_date = _res_date
  );
$$;

grant execute on function public._owns_reservation(uuid, timestamptz) to authenticated;

-- 6.5) Auto-assign user privilege on profile creation
create or replace function public._auto_assign_user_privilege()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If privileges array is empty or null, assign 'user' privilege
  if new.privileges is null or array_length(new.privileges, 1) is null then
    new.privileges := array['user'];
  end if;
  return new;
end;
$$;

create trigger auto_assign_user_privilege_trigger
  before insert on public.user_profiles
  for each row
  execute function public._auto_assign_user_privilege();

-- 7) Auto-pairing function for Open Water reservations
create or replace function public.auto_pair_open_water(p_uid uuid, p_res_date timestamptz)
returns void
language plpgsql
security definer
as $$
declare
  v_depth integer;
  v_auto_adjust boolean;
  v_candidate_uid uuid;
  v_candidate_depth integer;
begin
  -- Ensure target exists in res_openwater and parent reservation is confirmed
  if not exists (
    select 1 from public.reservations r
    where r.uid = p_uid and r.res_date = p_res_date and r.res_type = 'open_water' and r.res_status = 'confirmed'
  ) then
    return; -- nothing to do
  end if;

  select o.depth_m, o.auto_adjust_closest
    into v_depth, v_auto_adjust
  from public.res_openwater o
  where o.uid = p_uid and o.res_date = p_res_date
  for update;

  if v_depth is null then
    return;
  end if;

  -- Already paired? skip
  if exists (
    select 1 from public.res_openwater o where o.uid = p_uid and o.res_date = p_res_date and o.paired_uid is not null
  ) then
    return;
  end if;

  -- Try exact depth first among other confirmed open water reservations for the same day
  select c.uid, c.depth_m into v_candidate_uid, v_candidate_depth
  from public.res_openwater c
  join public.reservations r
    on r.uid = c.uid and r.res_date = c.res_date
  where c.res_date::date = p_res_date::date
    and c.uid <> p_uid
    and c.paired_uid is null
    and r.res_type = 'open_water'
    and r.res_status = 'confirmed'
    and c.depth_m = v_depth
  order by r.created_at asc
  for update skip locked
  limit 1;

  if v_candidate_uid is null and coalesce(v_auto_adjust, false) then
    -- Nearest depth by absolute difference, then oldest request first
    select c.uid, c.depth_m into v_candidate_uid, v_candidate_depth
    from public.res_openwater c
    join public.reservations r
      on r.uid = c.uid and r.res_date = c.res_date
    where c.res_date::date = p_res_date::date
      and c.uid <> p_uid
      and c.paired_uid is null
      and r.res_type = 'open_water'
      and r.res_status = 'confirmed'
    order by abs(c.depth_m - v_depth) asc, r.created_at asc
    for update skip locked
    limit 1;
  end if;

  if v_candidate_uid is not null then
    update public.res_openwater set paired_uid = v_candidate_uid, paired_at = now()
      where uid = p_uid and res_date = p_res_date;
    update public.res_openwater set paired_uid = p_uid, paired_at = now()
      where uid = v_candidate_uid and res_date = p_res_date;
  end if;
end;
$$;

grant execute on function public.auto_pair_open_water(uuid, timestamptz) to authenticated;

-- 8) Trigger: after reservation status changes to confirmed, attempt pairing (open_water only)
create or replace function public._trg_after_reservation_confirmed()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.res_type = 'open_water' and new.res_status = 'confirmed' then
    perform public.auto_pair_open_water(new.uid, new.res_date);
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_after_reservation_confirmed') then
    execute 'drop trigger trg_after_reservation_confirmed on public.reservations';
  end if;
  execute 'create trigger trg_after_reservation_confirmed after update of res_status on public.reservations for each row execute function public._trg_after_reservation_confirmed()';
end $$;

-- 9) RPC to fetch open water pair info (depth, auto flag, paired uid/name) with strict checks
create or replace function public.get_openwater_pair_info(p_uid uuid, p_res_date timestamptz)
returns table (
  depth_m integer,
  auto_adjust_closest boolean,
  paired_uid uuid,
  paired_name text
)
language plpgsql
security definer
as $$
begin
  -- Ensure the caller is the owner of the target reservation or an admin
  if not (
    exists (
      select 1 from auth.uid() as me
      join public.user_profiles up on up.uid = me
      where up.privileges @> array['admin']
    )
    or exists (
      select 1 from public.reservations r
      where r.uid = p_uid and r.res_date = p_res_date and r.uid = auth.uid()
    )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select o.depth_m,
         o.auto_adjust_closest,
         o.paired_uid,
         (select up2.name from public.user_profiles up2 where up2.uid = o.paired_uid)
  from public.res_openwater o
  where o.uid = p_uid and o.res_date = p_res_date;
end;
$$;

grant execute on function public.get_openwater_pair_info(uuid, timestamptz) to authenticated;

-- 10) RLS Policies
-- user_profiles: users manage their own row; admins can select/update all; no delete for users
create policy user_profiles_select_own
  on public.user_profiles for select
  using (auth.uid() = uid);

create policy user_profiles_insert_own
  on public.user_profiles for insert
  with check (auth.uid() = uid);

create policy user_profiles_update_own
  on public.user_profiles for update
  using (auth.uid() = uid)
  with check (auth.uid() = uid);

create policy user_profiles_admin_select_all
  on public.user_profiles for select
  using (public.is_admin());

create policy user_profiles_admin_update_all
  on public.user_profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Allow selecting paired user's profile name when there's an open water pairing relationship
create policy user_profiles_select_when_paired
on public.user_profiles
for select
to authenticated
using (
  -- Owner can always see own profile (redundant with existing policy, kept for clarity)
  uid = auth.uid()
  or exists (
    select 1
    from public.res_openwater o
    join public.reservations r on r.uid = o.uid and r.res_date = o.res_date
    where (
      -- I am the requester and the other is paired with me
      o.uid = auth.uid() and o.paired_uid = user_profiles.uid
    ) or (
      -- I am the pair and the other is the requester
      o.paired_uid = auth.uid() and o.uid = user_profiles.uid
    )
  )
);

-- reservations: users manage their own; admins manage all
create policy reservations_select_own
  on public.reservations for select
  using (auth.uid() = uid);

create policy reservations_insert_own
  on public.reservations for insert
  with check (auth.uid() = uid);

create policy reservations_update_own
  on public.reservations for update
  using (auth.uid() = uid)
  with check (auth.uid() = uid);

create policy reservations_delete_own
  on public.reservations for delete
  using (auth.uid() = uid);

create policy reservations_admin_select_all
  on public.reservations for select
  using (public.is_admin());

create policy reservations_admin_update_all
  on public.reservations for update
  using (public.is_admin())
  with check (public.is_admin());

create policy reservations_admin_delete_all
  on public.reservations for delete
  using (public.is_admin());

-- res_pool policies
create policy res_pool_select_own
  on public.res_pool for select
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );

create policy res_pool_insert_own
  on public.res_pool for insert
  with check ( public._owns_reservation(uid, res_date) );

create policy res_pool_update_own
  on public.res_pool for update
  using ( public._owns_reservation(uid, res_date) )
  with check ( public._owns_reservation(uid, res_date) );

create policy res_pool_delete_own
  on public.res_pool for delete
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );

-- res_openwater policies
create policy res_openwater_select_own
  on public.res_openwater for select
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );

create policy res_openwater_insert_own
  on public.res_openwater for insert
  with check ( public._owns_reservation(uid, res_date) );

create policy res_openwater_update_own
  on public.res_openwater for update
  using ( public._owns_reservation(uid, res_date) )
  with check ( public._owns_reservation(uid, res_date) );

create policy res_openwater_delete_own
  on public.res_openwater for delete
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );

-- res_classroom policies
create policy res_classroom_select_own
  on public.res_classroom for select
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );

create policy res_classroom_insert_own
  on public.res_classroom for insert
  with check ( public._owns_reservation(uid, res_date) );

create policy res_classroom_update_own
  on public.res_classroom for update
  using ( public._owns_reservation(uid, res_date) )
  with check ( public._owns_reservation(uid, res_date) );

create policy res_classroom_delete_own
  on public.res_classroom for delete
  using ( public._owns_reservation(uid, res_date) or public.is_admin() );
