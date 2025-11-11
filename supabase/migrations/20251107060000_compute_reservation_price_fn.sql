-- Read-only function to compute prices for a user's reservation by date
-- It returns one row per present category (pool, classroom, open_water)
-- No monthly cap logic for OW autonomous (can be added later)
-- Depends on:
--   - public.user_profiles.price_template_name -> public.price_templates(name)
--   - public.price_template_updates (latest by created_at)
--   - public.reservations + child tables: res_pool, res_classroom, res_openwater
-- Notes:
--   - Pool/classroom "course" pricing multiplies by student_count

BEGIN;

-- Ensure Pool and Classroom subtype enums exist and migrate columns to use them (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'pool_activity_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.pool_activity_type AS ENUM ('course_coaching','autonomous');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'classroom_activity_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.classroom_activity_type AS ENUM ('course_coaching');
  END IF;
END $$;

-- Migrate res_pool.pool_type from text -> public.pool_activity_type when applicable
DO $$
DECLARE
  v_udt_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_pool' AND column_name = 'pool_type'
  ) THEN
    SELECT udt_name INTO v_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_pool' AND column_name = 'pool_type';

    IF v_udt_name IS DISTINCT FROM 'pool_activity_type' THEN
      ALTER TABLE public.res_pool
        ALTER COLUMN pool_type TYPE public.pool_activity_type
        USING CASE
          WHEN pool_type IN ('course_coaching','autonomous') THEN pool_type::public.pool_activity_type
          ELSE NULL
        END;
    END IF;
  END IF;
END $$;

-- Migrate res_classroom.classroom_type from text -> public.classroom_activity_type when applicable
DO $$
DECLARE
  v_udt_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_classroom' AND column_name = 'classroom_type'
  ) THEN
    SELECT udt_name INTO v_udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'res_classroom' AND column_name = 'classroom_type';

    IF v_udt_name IS DISTINCT FROM 'classroom_activity_type' THEN
      ALTER TABLE public.res_classroom
        ALTER COLUMN classroom_type TYPE public.classroom_activity_type
        USING CASE
          WHEN classroom_type IN ('course_coaching') THEN classroom_type::public.classroom_activity_type
          ELSE NULL
        END;
    END IF;
  END IF;
END $$;

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
  /* Resolve user's latest price template update */
  with my_user as (
    select up.uid, up.price_template_name
    from public.user_profiles up
    where up.uid = p_uid
  ),
  latest_update as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by ptu.created_at desc
    limit 1
  ),
  /* Explicitly reference all required pricing columns so migration fails fast if any are missing */
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
  /* Collect prices per category if the reservation has a corresponding child row */
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
          then (select auto_ow from latest_update)
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
        /* Prefer enum activity_type, else map text open_water_type to enum when valid */
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

COMMENT ON FUNCTION public.compute_prices_for_reservation(uuid, date)
  IS 'Compute prices for a given user and reservation date across present categories. Uses latest price_template_updates via user_profiles.price_template_name. No OW cap.';

COMMIT;

-- Exact-per-reservation price rows (by uid + res_date timestamp)
BEGIN;

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
  /* Resolve user's latest price template update */
  with my_user as (
    select up.uid, up.price_template_name
    from public.user_profiles up
    where up.uid = p_uid
  ),
  latest_update as (
    select ptu.*
    from public.price_template_updates ptu
    join my_user mu on mu.price_template_name = ptu.price_template_name
    order by ptu.created_at desc
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
          then (select auto_ow from latest_update)
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

COMMENT ON FUNCTION public.compute_prices_for_reservation_at(uuid, timestamptz)
  IS 'Compute prices for a specific reservation row (uid + res_date timestamp).';

COMMIT;

-- Helper: total price for a single reservation date (sum across categories)
BEGIN;

CREATE OR REPLACE FUNCTION public.compute_reservation_total(
  p_res_date date
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  with me as (
    select auth.uid() as uid
  ),
  prices as (
    select t.price
    from me
    cross join lateral public.compute_prices_for_reservation((select uid from me), p_res_date) t
  )
  select coalesce(sum(price), 0)::integer from prices;
$$;

COMMENT ON FUNCTION public.compute_reservation_total(date)
  IS 'Sum of all category prices for the authenticated user on a reservation date';

COMMIT;

-- Helper: monthly totals for completed reservations in a date range for the authenticated user
BEGIN;

CREATE OR REPLACE FUNCTION public.compute_monthly_completed_totals(
  p_from date,
  p_to date
)
RETURNS TABLE(
  ym text,
  month date,
  total integer
)
LANGUAGE sql
STABLE
AS $$
  with me as (
    select auth.uid() as uid
  ),
  r as (
    select res_date::date as res_date, coalesce(price, 0)::integer as price
    from public.reservations
    where uid = (select uid from me)
      and (
        res_status = 'confirmed'
        or res_date::date <= current_date
      )
      and res_date::date between p_from and p_to
  )
  select to_char(date_trunc('month', res_date), 'YYYY-MM') as ym,
         date_trunc('month', res_date)::date as month,
         coalesce(sum(price), 0)::integer as total
  from r
  group by 2,1
  order by 2 desc;
$$;

COMMENT ON FUNCTION public.compute_monthly_completed_totals(date, date)
  IS 'Monthly total of completed reservations for the authenticated user between dates [p_from, p_to]';

COMMIT;
