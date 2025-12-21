-- Add admin_note table for buoy_group and update get_buoy_groups_with_names RPC
set search_path = public;

-- 1) Create separate table for buoy group admin notes with strict admin-only RLS
create table if not exists public.buoy_group_admin_notes (
  group_id integer primary key references public.buoy_group(id) on delete cascade,
  admin_note text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.user_profiles(uid)
);

alter table public.buoy_group_admin_notes enable row level security;

-- Only admins can see or touch this table
create policy buoy_group_admin_notes_admin_all
  on public.buoy_group_admin_notes
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- 2) Drop and recreate get_buoy_groups_with_names to include open_water_type and joined admin_note
drop function if exists public.get_buoy_groups_with_names(date, varchar);

create or replace function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
returns table (
  id integer,
  res_date date,
  time_period varchar,
  buoy_name varchar,
  boat varchar,
  open_water_type text,
  admin_note text,
  member_uids uuid[],
  member_names text[]
)
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.res_date,
    g.time_period,
    g.buoy_name,
    g.boat,
    g.open_water_type,
    an.admin_note,
    array_agg(r.uid order by r.uid) as member_uids,
    -- Prefer nickname, then name, for display
    array_agg(coalesce(up.nickname, up.name) order by coalesce(up.nickname, up.name)) as member_names
  from public.buoy_group g
  left join public.res_openwater r on r.group_id = g.id
  left join public.user_profiles up on up.uid = r.uid
  left join public.buoy_group_admin_notes an on an.group_id = g.id
  where g.res_date = p_res_date
    and g.time_period = p_time_period
  group by g.id, g.res_date, g.time_period, g.buoy_name, g.boat, g.open_water_type, an.admin_note
  order by g.buoy_name asc, g.id asc;
end;
$$;

comment on function public.get_buoy_groups_with_names(p_res_date date, p_time_period varchar)
  is 'Returns buoy groups with open_water_type, admin_note (from joined table), member_uids and member_names (preferring nicknames).';

grant execute on function public.get_buoy_groups_with_names(date, varchar) to authenticated;
