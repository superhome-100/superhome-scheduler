-- Fix trigger to handle multiple time periods for a uid+date by iterating distinct periods
set search_path = public;

create or replace function public._trg_after_reservation_confirmed_auto_buoy()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.res_type = 'open_water' and new.res_status = 'confirmed' then
    -- For this uid+date, iterate distinct time periods and run auto-assign per period
    perform public.auto_assign_buoy(new.res_date::date, tp)
    from (
      select distinct o.time_period as tp
      from public.res_openwater o
      where o.uid = new.uid and o.res_date = new.res_date and o.time_period is not null
    ) t;
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_after_reservation_confirmed_auto_buoy') then
    execute 'drop trigger trg_after_reservation_confirmed_auto_buoy on public.reservations';
  end if;
  execute 'create trigger trg_after_reservation_confirmed_auto_buoy after update of res_status on public.reservations for each row execute function public._trg_after_reservation_confirmed_auto_buoy()';
end $$;
