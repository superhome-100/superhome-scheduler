set search_path = public;

-- Allow authenticated users to read minimal name fields from user_profiles
-- when the target user has at least one confirmed reservation and is active.
-- This enables showing owner names in Pool/Classroom/Open Water cards under strict RLS.

begin;

-- Ensure RLS is enabled (no-op if already enabled)
alter table if exists public.user_profiles enable row level security;

-- Drop if re-running locally
drop policy if exists user_profiles_select_when_has_confirmed_reservation on public.user_profiles;

create policy user_profiles_select_when_has_confirmed_reservation
  on public.user_profiles
  for select
  to authenticated
  using (
    -- Only expose active users
    status = 'active'
    and exists (
      select 1
      from public.reservations r
      where r.uid = user_profiles.uid
        and r.res_status = 'confirmed'
    )
  );

commit;
