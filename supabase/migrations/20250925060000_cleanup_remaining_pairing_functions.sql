-- Clean up remaining pairing functions and triggers
-- This migration removes any remaining pairing-related database objects

-- Drop the trigger first (it depends on the function)
drop trigger if exists trg_after_reservation_confirmed on public.reservations;

-- Drop the trigger function that calls auto_pair_open_water
drop function if exists public._trg_after_reservation_confirmed();

-- Drop any remaining pairing functions
drop function if exists public.auto_pair_open_water(uuid, timestamptz);
drop function if exists public.get_openwater_pair_info(uuid, timestamptz);

-- Drop any remaining policies related to pairing
drop policy if exists "user_profiles_select_when_paired" on public.user_profiles;

-- Create a new trigger function without pairing logic
create or replace function public._trg_after_reservation_confirmed()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Propagate status to per-type child tables
  if new.res_type = 'open_water' then
    update public.res_openwater
      set res_status = new.res_status
    where uid = new.uid and res_date = new.res_date;
  elsif new.res_type = 'pool' then
    update public.res_pool
      set res_status = new.res_status
    where uid = new.uid and res_date = new.res_date;
  elsif new.res_type = 'classroom' then
    update public.res_classroom
      set res_status = new.res_status
    where uid = new.uid and res_date = new.res_date;
  end if;

  return new;
end;
$$;

-- Recreate the trigger without pairing logic
create trigger trg_after_reservation_confirmed 
after update of res_status on public.reservations 
for each row execute function public._trg_after_reservation_confirmed();
