-- Create enum types for strict value enforcement
create type public.user_status as enum ('active', 'disabled');
create type public.reservation_status as enum ('confirmed', 'rejected');
create type public.reservation_type as enum ('pool', 'open_water', 'classroom');

-- user_profiles table
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

-- reservations table
create table if not exists public.reservations (
  uid uuid not null references public.user_profiles (uid) on delete cascade,
  res_date timestamptz not null,
  res_type public.reservation_type not null,
  res_status public.reservation_status not null default 'confirmed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (uid, res_date)
);

comment on table public.reservations is 'Reservations made by users';
comment on column public.reservations.uid is 'FK: references user_profiles.uid';
comment on column public.reservations.res_date is 'The date and time of the reservation';
comment on column public.reservations.res_type is 'Type of reservation: pool, open_water, classroom';
comment on column public.reservations.res_status is 'Reservation status: confirmed or rejected';

-- Indexes for efficient lookups
create index if not exists reservations_res_date_idx on public.reservations (res_date);

-- Enable RLS (strict)
alter table public.user_profiles enable row level security;
alter table public.reservations enable row level security;

-- USER PROFILES POLICIES: user can only manage their own row
create policy "user_profiles_select_own"
  on public.user_profiles for select
  using (auth.uid() = uid);

create policy "user_profiles_insert_own"
  on public.user_profiles for insert
  with check (auth.uid() = uid);

create policy "user_profiles_update_own"
  on public.user_profiles for update
  using (auth.uid() = uid)
  with check (auth.uid() = uid);

-- No delete policy (strict): users cannot delete their profile rows by default

-- RESERVATIONS POLICIES: user can only manage their own reservations
create policy "reservations_select_own"
  on public.reservations for select
  using (auth.uid() = uid);

create policy "reservations_insert_own"
  on public.reservations for insert
  with check (auth.uid() = uid);

create policy "reservations_update_own"
  on public.reservations for update
  using (auth.uid() = uid)
  with check (auth.uid() = uid);

create policy "reservations_delete_own"
  on public.reservations for delete
  using (auth.uid() = uid);
