-- Fix pricing to use the template update effective at or before the reservation date
-- and backfill reservations.price to stay consistent with UI RPC results.

BEGIN;

-- Redefine compute_prices_for_reservation to select effective update by date
CREATE OR REPLACE FUNCTION public.compute_prices_for_reservation(
  p_uid uuid,
  p_res_date date
)
RETURNS TABLE(
  category text,
  type_key text,
  price integer,
  price_field text
)
LANGUAGE sql
STABLE
AS $$
  /* Resolve user's price template */
  with my_user as (
    select up.uid, up.price_template_name
    from public.user_profiles up
    where up.uid = p_uid
  ),
  -- pick the latest update ON OR BEFORE the reservation date; if none, fall back to earliest
  update_before as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    where ptu.created_at::date <= p_res_date
    order by ptu.created_at desc
    limit 1
  ),
  update_earliest as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by ptu.created_at asc
    limit 1
  ),
  effective_update as (
    select * from update_before
    union all
    select * from update_earliest
    where not exists (select 1 from update_before)
    limit 1
  ),
  required_price_fields as (
    select 
      coach_pool,
      auto_pool,
      coach_classroom,
      coach_ow,
      auto_ow,
      platform_ow,
      platformcbs_ow
    from effective_update
  ),
  r as (
    select *
    from public.reservations
    where uid = p_uid and res_date::date = p_res_date
  )
  select * from (
    -- Pool
    select
      'pool'::text as category,
      (p.pool_type)::text as type_key,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then (select coach_pool from effective_update) * coalesce(p.student_count, 1)
        when p.pool_type = 'autonomous'::public.pool_activity_type then (select auto_pool from effective_update)
        else null
      end::integer as price,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then 'coach_pool'
        when p.pool_type = 'autonomous'::public.pool_activity_type then 'auto_pool'
        else null
      end as price_field
    from r
    join public.res_pool p on p.uid = r.uid and p.res_date = r.res_date
    cross join required_price_fields

    union all

    -- Classroom
    select
      'classroom'::text as category,
      (c.classroom_type)::text as type_key,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then (select coach_classroom from effective_update) * coalesce(c.student_count, 1)
        else null
      end::integer as price,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then 'coach_classroom'
        else null
      end as price_field
    from r
    join public.res_classroom c on c.uid = r.uid and c.res_date = r.res_date
    cross join required_price_fields

    union all

    -- Open water
    select
      'open_water'::text as category,
      (public._compute_openwater_activity_type(o.eff_act, o.depth_m))::text as type_key,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type
          then (select coach_ow from effective_update) * coalesce(o.student_count, 1)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type
          then (select auto_ow from effective_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type
          then (select platform_ow from effective_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type
          then (select platformcbs_ow from effective_update)
        else null
      end::integer as price,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type then 'coach_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type then 'auto_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type then 'platform_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type then 'platformcbs_ow'
        else null
      end as price_field
    from r
    join (
      select 
        uid,
        res_date,
        res_status,
        time_period,
        depth_m,
        buoy,
        auto_adjust_closest,
        pulley,
        bottom_plate,
        large_buoy,
        note,
        student_count,
        open_water_type,
        activity_type,
        coalesce(
          activity_type,
          case 
            when open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
              then open_water_type::public.openwater_activity_type
            else null
          end
        ) as eff_act
      from public.res_openwater
    ) o on o.uid = r.uid and o.res_date = r.res_date
    cross join required_price_fields
  ) t
  where price is not null;
$$;

-- Redefine compute_prices_for_reservation_at to select effective update by timestamp date
CREATE OR REPLACE FUNCTION public.compute_prices_for_reservation_at(
  p_uid uuid,
  p_res_ts timestamptz
)
RETURNS TABLE(
  category text,
  type_key text,
  price integer,
  price_field text
)
LANGUAGE sql
STABLE
AS $$
  with my_user as (
    select up.uid, up.price_template_name
    from public.user_profiles up
    where up.uid = p_uid
  ),
  update_before as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    where ptu.created_at <= p_res_ts
    order by ptu.created_at desc
    limit 1
  ),
  update_earliest as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by ptu.created_at asc
    limit 1
  ),
  effective_update as (
    select * from update_before
    union all
    select * from update_earliest
    where not exists (select 1 from update_before)
    limit 1
  ),
  required_price_fields as (
    select 
      coach_pool,
      auto_pool,
      coach_classroom,
      coach_ow,
      auto_ow,
      platform_ow,
      platformcbs_ow
    from effective_update
  ),
  r as (
    select *
    from public.reservations
    where uid = p_uid and res_date = p_res_ts
  )
  select * from (
    -- Pool
    select
      'pool'::text as category,
      (p.pool_type)::text as type_key,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then (select coach_pool from effective_update) * coalesce(p.student_count, 1)
        when p.pool_type = 'autonomous'::public.pool_activity_type then (select auto_pool from effective_update)
        else null
      end::integer as price,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then 'coach_pool'
        when p.pool_type = 'autonomous'::public.pool_activity_type then 'auto_pool'
        else null
      end as price_field
    from r
    join public.res_pool p on p.uid = r.uid and p.res_date = r.res_date
    cross join required_price_fields

    union all

    -- Classroom
    select
      'classroom'::text as category,
      (c.classroom_type)::text as type_key,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then (select coach_classroom from effective_update) * coalesce(c.student_count, 1)
        else null
      end::integer as price,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then 'coach_classroom'
        else null
      end as price_field
    from r
    join public.res_classroom c on c.uid = r.uid and c.res_date = r.res_date
    cross join required_price_fields

    union all

    -- Open water
    select
      'open_water'::text as category,
      (public._compute_openwater_activity_type(o.eff_act, o.depth_m))::text as type_key,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type
          then (select coach_ow from effective_update) * coalesce(o.student_count, 1)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type
          then (select auto_ow from effective_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type
          then (select platform_ow from effective_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type
          then (select platformcbs_ow from effective_update)
        else null
      end::integer as price,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type then 'coach_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type then 'auto_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type then 'platform_ow'
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type then 'platformcbs_ow'
        else null
      end as price_field
    from r
    join (
      select 
        uid,
        res_date,
        res_status,
        time_period,
        depth_m,
        buoy,
        auto_adjust_closest,
        pulley,
        bottom_plate,
        large_buoy,
        note,
        student_count,
        open_water_type,
        activity_type,
        coalesce(
          activity_type,
          case 
            when open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
              then open_water_type::public.openwater_activity_type
            else null
          end
        ) as eff_act
      from public.res_openwater
    ) o on o.uid = r.uid and o.res_date = r.res_date
    cross join required_price_fields
  ) t
  where price is not null;
$$;

-- Backfill all reservation prices to match new effective-by-date logic
UPDATE public.reservations r
SET price = public.compute_reservation_total_for(r.uid, r.res_date),
    updated_at = now();

COMMIT;
