-- Fix monthly pool participant counts: include course/coaching even when lane is not assigned
-- Do NOT delete migrations per repository rules

BEGIN;

CREATE OR REPLACE FUNCTION get_monthly_reservation_stats(
  start_date date,
  end_date date
)
RETURNS TABLE (
  res_date date,
  res_type reservation_type,
  time_period text,
  participant_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY

  -- Open Water: Confirmed + Pending, grouped by AM/PM
  SELECT
    r.res_date::date,
    r.res_type,
    COALESCE(ow.time_period, 'AM') as time_period,
    SUM(1 + COALESCE(ow.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_openwater ow ON r.uid = ow.uid AND r.res_date = ow.res_date
  WHERE r.res_date >= start_date
    AND r.res_date <= end_date
    AND r.res_type = 'open_water'
    AND r.res_status IN ('confirmed', 'pending')
  GROUP BY r.res_date::date, r.res_type, ow.time_period

  UNION ALL

  -- Pool: Confirmed + Pending
  -- NOTE: For course/coaching, lane may legitimately be NULL; still require start/end.
  SELECT
    r.res_date::date,
    r.res_type,
    'ALL' as time_period,
    SUM(1 + COALESCE(p.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_pool p ON r.uid = p.uid AND r.res_date = p.res_date
  WHERE r.res_date >= start_date
    AND r.res_date <= end_date
    AND r.res_type = 'pool'
    AND r.res_status IN ('confirmed', 'pending')
    AND p.start_time IS NOT NULL
    AND p.end_time IS NOT NULL
    AND (p.lane IS NOT NULL OR p.pool_type = 'course_coaching')
  GROUP BY r.res_date::date, r.res_type

  UNION ALL

  -- Classroom: Confirmed + Pending
  SELECT
    r.res_date::date,
    r.res_type,
    'ALL' as time_period,
    SUM(1 + COALESCE(c.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_classroom c ON r.uid = c.uid AND r.res_date = c.res_date
  WHERE r.res_date >= start_date
    AND r.res_date <= end_date
    AND r.res_type = 'classroom'
    AND r.res_status IN ('confirmed', 'pending')
    AND c.start_time IS NOT NULL
    AND c.end_time IS NOT NULL
  GROUP BY r.res_date::date, r.res_type;

END;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_reservation_stats(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_reservation_stats(date, date) TO service_role;

COMMIT;
