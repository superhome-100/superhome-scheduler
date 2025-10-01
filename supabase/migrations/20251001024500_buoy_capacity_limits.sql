-- Enforce max 3 divers per buoy group and support multiple groups per buoy
set search_path = public;

-- Safety: ensure supporting indexes exist for fast lookups
create index if not exists buoy_group_date_period_buoy_idx on public.buoy_group (res_date, time_period, buoy_name);
create index if not exists bgm_group_idx on public.buoy_group_members (group_id);

-- Strong constraint: BEFORE INSERT trigger already added earlier as _enforce_max_three_members.
-- Recreate the trigger function and trigger idempotently to guarantee it's present.
create or replace function public._enforce_max_three_members()
returns trigger
language plpgsql
as $$
begin
  if (
    select count(*) from public.buoy_group_members m where m.group_id = new.group_id
  ) >= 3 then
    raise exception 'buoy_group % already has 3 members', new.group_id using errcode = '23514';
  end if;
  return new;
end;
$$;

-- Create trigger if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_buoy_group_members_limit'
  ) THEN
    EXECUTE 'create trigger trg_buoy_group_members_limit before insert on public.buoy_group_members for each row execute function public._enforce_max_three_members()';
  END IF;
END $$;

-- RLS stays admin-only; multiple groups sharing the same buoy_name, res_date, time_period are allowed by design.
