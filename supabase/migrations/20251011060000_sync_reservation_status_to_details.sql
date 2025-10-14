-- Sync reservation status from parent `public.reservations` to detail tables
-- Applies to: res_openwater, res_pool, res_classroom
-- Rule: whenever reservations.res_status changes, mirror it to the corresponding detail row
-- Note: This runs on the database side and respects RLS as it is executed with the caller privileges of the mutating statement.

set search_path = public;

-- Create or replace trigger function to sync status
create or replace function public.sync_reservation_status_to_details()
returns trigger
language plpgsql
as $$
begin
  -- Only act when status actually changes
  if tg_op = 'UPDATE' and coalesce(new.res_status, 'pending') is distinct from coalesce(old.res_status, 'pending') then
    -- Update detail table depending on reservation type
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
  end if;
  return new;
end;
$$;

-- Drop existing trigger if present (idempotent)
do $$
begin
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'tr_sync_res_status_to_details'
      and n.nspname = 'public'
      and c.relname = 'reservations'
  ) then
    execute 'drop trigger tr_sync_res_status_to_details on public.reservations';
  end if;
end$$;

-- Create the trigger: fires after update of res_status, once per row
create trigger tr_sync_res_status_to_details
after update of res_status on public.reservations
for each row
execute function public.sync_reservation_status_to_details();
