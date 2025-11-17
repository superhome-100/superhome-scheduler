set search_path = public;

-- 1) Add nickname column to user_profiles (nullable), and backfill from name
alter table public.user_profiles
  add column if not exists nickname text;

comment on column public.user_profiles.nickname is 'Preferred short display name for the user';

-- Backfill existing rows so app can immediately use nickname
update public.user_profiles
set nickname = coalesce(nullif(nickname, ''), name)
where nickname is distinct from coalesce(nullif(nickname, ''), name);

-- Optional: ensure updated_at touches when nickname changes
create or replace function public._touch_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Drop and recreate to cover nickname updates too
do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_user_profiles_touch_updated_at') then
    execute 'drop trigger trg_user_profiles_touch_updated_at on public.user_profiles';
  end if;
  execute 'create trigger trg_user_profiles_touch_updated_at before update of name, status, privileges, nickname on public.user_profiles for each row execute function public._touch_user_profiles_updated_at()';
end $$;

-- 2) Update RPCs/functions that return/display names to use nickname
-- get_openwater_pair_info: paired_name should prefer nickname
create or replace function public.get_openwater_pair_info(p_uid uuid, p_res_date timestamptz)
returns table (
  depth_m integer,
  auto_adjust_closest boolean,
  paired_uid uuid,
  paired_name text
)
language plpgsql
security definer
as $$
begin
  if not (
    exists (
      select 1 from auth.uid() as me
      join public.user_profiles up on up.uid = me
      where up.privileges @> array['admin']
    )
    or exists (
      select 1 from public.reservations r
      where r.uid = p_uid and r.res_date = p_res_date and r.uid = auth.uid()
    )
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select o.depth_m,
         o.auto_adjust_closest,
         o.paired_uid,
         (select coalesce(up2.nickname, up2.name) from public.user_profiles up2 where up2.uid = o.paired_uid)
  from public.res_openwater o
  where o.uid = p_uid and o.res_date = p_res_date;
end;
$$;

grant execute on function public.get_openwater_pair_info(uuid, timestamptz) to authenticated;

-- 3) Ensure new profiles default nickname from name when not provided
create or replace function public._default_nickname_from_name()
returns trigger
language plpgsql
as $$
begin
  if new.nickname is null or new.nickname = '' then
    new.nickname := new.name;
  end if;
  return new;
end;
$$;

do $$
begin
  if exists (select 1 from pg_trigger where tgname = 'trg_user_profiles_default_nickname') then
    execute 'drop trigger trg_user_profiles_default_nickname on public.user_profiles';
  end if;
  execute 'create trigger trg_user_profiles_default_nickname before insert on public.user_profiles for each row execute function public._default_nickname_from_name()';
end $$;
