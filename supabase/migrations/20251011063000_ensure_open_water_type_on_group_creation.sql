-- Ensure open_water_type is populated when buoy groups are created
set search_path = public;

-- Create a trigger function that ensures open_water_type is populated
-- when a buoy_group is created without it
create or replace function public.trg_ensure_open_water_type()
returns trigger
language plpgsql
as $$
begin
  -- If open_water_type is null, try to get it from the first member
  if new.open_water_type is null then
    select distinct o.open_water_type into new.open_water_type
    from public.res_openwater o
    where o.group_id = new.id
      and o.open_water_type is not null
    limit 1;
    
    -- If still null, set a default
    if new.open_water_type is null then
      new.open_water_type := 'Course/Coaching';
    end if;
  end if;
  
  return new;
end;
$$;

-- Create the trigger
drop trigger if exists tr_ensure_open_water_type on public.buoy_group;
create trigger tr_ensure_open_water_type
  before insert or update on public.buoy_group
  for each row
  execute function public.trg_ensure_open_water_type();

-- Also update existing groups that might have been created without open_water_type
update public.buoy_group g
set open_water_type = (
  select distinct o.open_water_type
  from public.res_openwater o
  where o.group_id = g.id
    and o.open_water_type is not null
  limit 1
)
where g.open_water_type is null
  and exists (
    select 1 from public.res_openwater o
    where o.group_id = g.id
      and o.open_water_type is not null
  );

-- Set default for any remaining null values
update public.buoy_group g
set open_water_type = 'Course/Coaching'
where g.open_water_type is null
  and exists (
    select 1 from public.res_openwater o
    where o.group_id = g.id
  );
