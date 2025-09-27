-- Sync res_openwater.res_status with parent reservations.res_status
set search_path = public;

-- Replace the existing trigger function to both sync child status and attempt pairing on confirm
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

  -- When confirmed and open water, try to pair
  if new.res_type = 'open_water' and new.res_status = 'confirmed' then
    perform public.auto_pair_open_water(new.uid, new.res_date);
  end if;

  return new;
end;
$$;

-- Ensure trigger exists and points to the (re)created function
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_after_reservation_confirmed'
  ) THEN
    EXECUTE 'create trigger trg_after_reservation_confirmed after update of res_status on public.reservations for each row execute function public._trg_after_reservation_confirmed()';
  END IF;
END $$;
