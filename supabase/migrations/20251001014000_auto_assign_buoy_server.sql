-- Server-side auto-assign buoy and membership table for robust grouping
set search_path = public;

-- 1) Members table to normalize diver assignments and enforce constraints
create table if not exists public.buoy_group_members (
  id serial primary key,
  group_id integer not null references public.buoy_group(id) on delete cascade,
  uid uuid not null references public.user_profiles(uid) on delete cascade,
  added_at timestamptz not null default now(),
  unique (group_id, uid)
);

create index if not exists buoy_group_members_group_idx on public.buoy_group_members(group_id);
create index if not exists buoy_group_members_uid_idx on public.buoy_group_members(uid);

comment on table public.buoy_group_members is 'Normalized members of a buoy group (max 3 via trigger).';

-- 2) Trigger to enforce max 3 members per group
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

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_buoy_group_members_limit') then
    execute 'create trigger trg_buoy_group_members_limit before insert on public.buoy_group_members for each row execute function public._enforce_max_three_members()';
  end if;
end $$;

-- 3) RLS admin-only for members as well
alter table public.buoy_group_members enable row level security;
create policy buoy_group_members_admin_select_all on public.buoy_group_members for select using (public.is_admin());
create policy buoy_group_members_admin_insert_all on public.buoy_group_members for insert with check (public.is_admin());
create policy buoy_group_members_admin_update_all on public.buoy_group_members for update using (public.is_admin()) with check (public.is_admin());
create policy buoy_group_members_admin_delete_all on public.buoy_group_members for delete using (public.is_admin());

-- 4) RPC: auto assign buoy on server (transactional)
create or replace function public.auto_assign_buoy(p_res_date date, p_time_period varchar)
returns json
language plpgsql
security definer
as $$
declare
  v_created_ids int[] := '{}';
  v_skipped jsonb := '[]'::jsonb;
  r_row record;
  group_rows uuid[] := '{}';
  group_depths int[] := '{}';
  v_group_id int;
  v_max_depth int;
  v_buoy_name varchar(64);
  v_count int;
begin
  -- Admin check
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  -- Iterate rows directly
  for r_row in
    select o.uid, o.depth_m
    from public.res_openwater o
    where o.res_status = 'pending'
      and o.time_period = p_time_period
      and o.depth_m is not null
      and o.res_date >= p_res_date::timestamptz
      and o.res_date < (p_res_date + 1)::timestamptz
    order by o.depth_m asc
  loop

    -- start a new group with current candidate if empty
    if array_length(group_rows,1) is null then
      group_rows := array[r_row.uid];
      group_depths := array[r_row.depth_m];
      continue;
    end if;

    -- try to add within 15m difference from first member's depth
    if array_length(group_rows,1) < 3 and abs(r_row.depth_m - group_depths[1]) <= 15 then
      group_rows := group_rows || r_row.uid;
      group_depths := group_depths || r_row.depth_m;
    else
      -- finalize current group before starting a new one
      v_max_depth := (select max(d) from unnest(group_depths) as d);
      v_buoy_name := public.find_best_buoy_for_depth(v_max_depth);

      if v_buoy_name is null then
        v_skipped := v_skipped || jsonb_build_array(
          jsonb_build_object('reason', 'no_buoy_available', 'uids', group_rows)
        );
      else
        insert into public.buoy_group(res_date, time_period, buoy_name)
        values (p_res_date, p_time_period, v_buoy_name)
        returning id into v_group_id;

        -- Insert members (up to 3)
        insert into public.buoy_group_members(group_id, uid)
        select v_group_id, m
        from unnest(group_rows) as m
        limit 3;

        v_created_ids := v_created_ids || v_group_id;
      end if;

      -- start the next group with the current record
      group_rows := array[r_row.uid];
      group_depths := array[r_row.depth_m];
    end if;
  end loop;

  -- finalize any remaining group
  if array_length(group_rows,1) is not null then
    v_max_depth := (select max(d) from unnest(group_depths) as d);
    v_buoy_name := public.find_best_buoy_for_depth(v_max_depth);

    if v_buoy_name is null then
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object('reason', 'no_buoy_available', 'uids', group_rows)
      );
    else
      insert into public.buoy_group(res_date, time_period, buoy_name)
      values (p_res_date, p_time_period, v_buoy_name)
      returning id into v_group_id;

      -- Insert members (up to 3)
      insert into public.buoy_group_members(group_id, uid)
      select v_group_id, m
      from unnest(group_rows) as m
      limit 3;

      v_created_ids := v_created_ids || v_group_id;
    end if;
  end if;

  return json_build_object(
    'createdGroupIds', coalesce(v_created_ids, '{}'),
    'skipped', coalesce(v_skipped, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.auto_assign_buoy(date, varchar) to authenticated;
