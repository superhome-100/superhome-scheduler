-- Harden trigger function with SECURITY DEFINER and backfill existing rows
set search_path = public;

-- Recreate function with SECURITY DEFINER to avoid RLS blocking detail updates
create or replace function public.sync_reservation_status_to_details()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and coalesce(new.res_status, 'pending') is distinct from coalesce(old.res_status, 'pending') then
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

-- Backfill: sync existing rows across all detail tables
update public.res_openwater o
set res_status = r.res_status
from public.reservations r
where r.uid = o.uid and r.res_date = o.res_date and o.res_status is distinct from r.res_status;

update public.res_pool p
set res_status = r.res_status
from public.reservations r
where r.uid = p.uid and r.res_date = p.res_date and p.res_status is distinct from r.res_status;

update public.res_classroom c
set res_status = r.res_status
from public.reservations r
where r.uid = c.uid and r.res_date = c.res_date and c.res_status is distinct from r.res_status;
