-- Enforce that only ACTIVE users can create reservations and details
set search_path = public;

-- Helper: boolean check for active user
create or replace function public._current_user_is_active()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_profiles up
    where up.uid = auth.uid()
      and up.status = 'active'
  );
$$;

grant execute on function public._current_user_is_active() to authenticated;

-- Update reservations insert policy to require active status
drop policy if exists reservations_insert_own on public.reservations;
create policy reservations_insert_own
  on public.reservations for insert
  with check (
    auth.uid() = uid
    and public._current_user_is_active()
  );

-- Update child table insert policies similarly
-- res_pool
drop policy if exists res_pool_insert_own on public.res_pool;
create policy res_pool_insert_own
  on public.res_pool for insert
  with check (
    public._owns_reservation(uid, res_date)
    and public._current_user_is_active()
  );

-- res_openwater
drop policy if exists res_openwater_insert_own on public.res_openwater;
create policy res_openwater_insert_own
  on public.res_openwater for insert
  with check (
    public._owns_reservation(uid, res_date)
    and public._current_user_is_active()
  );

-- res_classroom
drop policy if exists res_classroom_insert_own on public.res_classroom;
create policy res_classroom_insert_own
  on public.res_classroom for insert
  with check (
    public._owns_reservation(uid, res_date)
    and public._current_user_is_active()
  );
