-- Migration: Implement maxChargeableOWPerMonth logic in pricing functions
-- Description: Replaces hardcoded 12 session discount with dynamic setting for OW autonomous on buoy.

BEGIN;

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
  with my_user as (
    select up.uid, up.price_template_name
    from public.user_profiles up
    where up.uid = p_uid
  ),
  ranked_updates as (
    select ptu.*, 
           case when ptu.created_at::date <= p_res_date then 1 else 0 end as effective_flag
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by effective_flag desc, ptu.created_at desc
    limit 1
  ),
  app_settings as (
    select "maxChargeableOWPerMonth"
    from public.settings_updates
    where settings_name = 'default'
    order by created_at desc
    limit 1
  ),
  latest_update as (
    select * from ranked_updates limit 1
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
    from latest_update
  ),
  r as (
    select *
    from public.reservations
    where uid = p_uid and res_date::date = p_res_date
  )
  select * from (
    /* Pool */
    select
      'pool'::text as category,
      (p.pool_type)::text as type_key,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then (select coach_pool from latest_update) * coalesce(p.student_count, 1)
        when p.pool_type = 'autonomous'::public.pool_activity_type then (select auto_pool from latest_update)
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

    /* Classroom */
    select
      'classroom'::text as category,
      (c.classroom_type)::text as type_key,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then (select coach_classroom from latest_update) * coalesce(c.student_count, 1)
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

    /* Open water */
    select
      'open_water'::text as category,
      (public._compute_openwater_activity_type(o.eff_act, o.depth_m))::text as type_key,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type
          then (select coach_ow from latest_update) * coalesce(o.student_count, 1)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type
          then 
            case 
              when o.prev_auto_buoy_count >= coalesce((select "maxChargeableOWPerMonth" from app_settings), 12)
              then 0
              else (select auto_ow from latest_update)
            end
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type
          then (select platform_ow from latest_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type
          then (select platformcbs_ow from latest_update)
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
        *,
        coalesce(
          activity_type,
          case 
            when open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
              then open_water_type::public.openwater_activity_type
            else null
          end
        ) as eff_act,
        (
          select count(*)::integer
          from public.reservations r2
          join public.res_openwater o2 on o2.uid = r2.uid and o2.res_date = r2.res_date
          where r2.uid = res_openwater.uid
            and r2.res_status in ('confirmed', 'pending')
            and date_trunc('month', r2.res_date) = date_trunc('month', res_openwater.res_date)
            and r2.res_date < res_openwater.res_date
            and public._compute_openwater_activity_type(
                  coalesce(
                    o2.activity_type,
                    case 
                      when o2.open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
                        then o2.open_water_type::public.openwater_activity_type
                      else null
                    end
                  ),
                  o2.depth_m
                ) = 'autonomous_buoy'::public.openwater_activity_type
        ) as prev_auto_buoy_count
      from public.res_openwater
    ) o on o.uid = r.uid and o.res_date = r.res_date
    cross join required_price_fields
  ) t
  where price is not null;
$$;

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
  ranked_updates as (
    select ptu.*, 
           case when ptu.created_at <= p_res_ts then 1 else 0 end as effective_flag
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by effective_flag desc, ptu.created_at desc
    limit 1
  ),
  app_settings as (
    select "maxChargeableOWPerMonth"
    from public.settings_updates
    where settings_name = 'default'
    order by created_at desc
    limit 1
  ),
  latest_update as (
    select * from ranked_updates limit 1
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
    from latest_update
  ),
  r as (
    select *
    from public.reservations
    where uid = p_uid and res_date = p_res_ts
  )
  select * from (
    /* Pool */
    select
      'pool'::text as category,
      (p.pool_type)::text as type_key,
      case
        when p.pool_type = 'course_coaching'::public.pool_activity_type then (select coach_pool from latest_update) * coalesce(p.student_count, 1)
        when p.pool_type = 'autonomous'::public.pool_activity_type then (select auto_pool from latest_update)
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

    /* Classroom */
    select
      'classroom'::text as category,
      (c.classroom_type)::text as type_key,
      case
        when c.classroom_type = 'course_coaching'::public.classroom_activity_type then (select coach_classroom from latest_update) * coalesce(c.student_count, 1)
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

    /* Open water */
    select
      'open_water'::text as category,
      (public._compute_openwater_activity_type(o.eff_act, o.depth_m))::text as type_key,
      case
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'course_coaching'::public.openwater_activity_type
          then (select coach_ow from latest_update) * coalesce(o.student_count, 1)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_buoy'::public.openwater_activity_type
          then 
            case 
              when o.prev_auto_buoy_count >= coalesce((select "maxChargeableOWPerMonth" from app_settings), 12)
              then 0
              else (select auto_ow from latest_update)
            end
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform'::public.openwater_activity_type
          then (select platform_ow from latest_update)
        when public._compute_openwater_activity_type(o.eff_act, o.depth_m) = 'autonomous_platform_cbs'::public.openwater_activity_type
          then (select platformcbs_ow from latest_update)
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
        *,
        coalesce(
          activity_type,
          case 
            when open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
              then open_water_type::public.openwater_activity_type
            else null
          end
        ) as eff_act,
        (
          select count(*)::integer
          from public.reservations r2
          join public.res_openwater o2 on o2.uid = r2.uid and o2.res_date = r2.res_date
          where r2.uid = res_openwater.uid
            and r2.res_status in ('confirmed', 'pending')
            and date_trunc('month', r2.res_date) = date_trunc('month', res_openwater.res_date)
            and r2.res_date < res_openwater.res_date
            and public._compute_openwater_activity_type(
                  coalesce(
                    o2.activity_type,
                    case 
                      when o2.open_water_type in ('course_coaching','autonomous_buoy','autonomous_platform','autonomous_platform_cbs')
                        then o2.open_water_type::public.openwater_activity_type
                      else null
                    end
                  ),
                  o2.depth_m
                ) = 'autonomous_buoy'::public.openwater_activity_type
        ) as prev_auto_buoy_count
      from public.res_openwater
    ) o on o.uid = r.uid and o.res_date = r.res_date
    cross join required_price_fields
  ) t
  where price is not null;
$$;

-- Trigger backfill for existing reservations to apply the new logic
UPDATE public.reservations r
SET price = public.compute_reservation_total_for(r.uid, r.res_date),
    updated_at = now()
WHERE r.res_type = 'open_water'
  AND r.res_status IN ('confirmed', 'pending');

COMMIT;
