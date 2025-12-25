-- Refine get_buoy_groups_public to better handle admin_note visibility and membership
set search_path = public;

begin;

-- Drop function first because return signature is changing
drop function if exists public.get_buoy_groups_public(date, varchar);

create or replace function public.get_buoy_groups_public(
  p_res_date date,
  p_time_period varchar
)
returns table (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  member_uids uuid[],
  member_names text[],
  boat_count integer,
  open_water_type text,
  member_statuses text[],
  admin_note text
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.res_date,
    g.time_period,
    g.buoy_name,
    g.boat,
    -- Aggregate UIDs: always include confirmed ones, and include the caller if they are in this group
    array_remove(array_agg(distinct 
      case 
        when rv.res_status = 'confirmed' then r.uid 
        when r.uid = auth.uid() then r.uid
        else null 
      end
    ), null)::uuid[] as member_uids,
    -- Aggregate names: only include confirmed ones, and include the caller
    array_remove(array_agg(distinct
      case 
        when rv.res_status = 'confirmed' then coalesce(up.nickname, up.name)
        when r.uid = auth.uid() then coalesce(up.nickname, up.name)
        else null 
      end
    ), null)::text[] as member_names,
    -- count confirmed members
    count(distinct case when rv.res_status = 'confirmed' then r.uid else null end)::integer as boat_count,
    g.open_water_type::text as open_water_type,
    array_remove(array_agg(distinct
      case 
        when rv.res_status = 'confirmed' then (rv.res_status)::text
        when r.uid = auth.uid() then (rv.res_status)::text
        else null 
      end
    ), null)::text[] as member_statuses,
    -- Only expose admin_note to members of the group (even if pending) or admins
    (case 
      when public.is_admin() then max(an.admin_note)
      when exists (
        select 1 from public.res_openwater r2 
        where r2.group_id = g.id and r2.uid = auth.uid()
      ) then max(an.admin_note)
      else null 
    end) as admin_note
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  -- Join reservations without status filter initially to see all potential members
  left join public.reservations rv on rv.uid = r.uid and rv.res_date = r.res_date
  left join public.buoy_group_admin_notes an on an.group_id = g.id
  where g.res_date = p_res_date
    and g.time_period = p_time_period
    -- The group itself should show if it has at least one confirmed reservation, 
    -- OR if the caller itself has a reservation in it (even if pending).
    and exists (
      select 1 from public.res_openwater r3
      join public.reservations rv3 on rv3.uid = r3.uid and rv3.res_date = r3.res_date
      where r3.group_id = g.id 
        and (rv3.res_status = 'confirmed' or r3.uid = auth.uid())
    )
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.open_water_type
  order by g.buoy_name asc, g.id asc;
$$;

commit;
