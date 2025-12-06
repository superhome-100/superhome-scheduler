set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_monthly_reservation_stats(start_date date, end_date date)
 RETURNS TABLE(res_date date, res_type public.reservation_type, time_period text, participant_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  
  -- Open Water: Confirmed + Pending, grouped by AM/PM
  SELECT
    r.res_date::date,
    r.res_type,
    COALESCE(ow.time_period, 'AM') as time_period, -- Default to AM if missing, though shouldn't be
    SUM(1 + COALESCE(ow.student_count, 0))::bigint as participant_count
  FROM reservations r
  JOIN res_openwater ow ON r.uid = ow.uid AND r.res_date = ow.res_date
  WHERE r.res_date >= start_date 
    AND r.res_date <= end_date
    AND r.res_type = 'open_water'
    AND r.res_status IN ('confirmed', 'pending')
  GROUP BY r.res_date::date, r.res_type, ow.time_period

  UNION ALL

  -- Pool: Confirmed only, must be plotted (have start/end/lane)
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
    AND r.res_status = 'confirmed'
    AND p.start_time IS NOT NULL 
    AND p.end_time IS NOT NULL 
    AND p.lane IS NOT NULL
  GROUP BY r.res_date::date, r.res_type

  UNION ALL

  -- Classroom: Confirmed only, must be plotted (have start/end)
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
    AND r.res_status = 'confirmed'
    AND c.start_time IS NOT NULL 
    AND c.end_time IS NOT NULL
  GROUP BY r.res_date::date, r.res_type;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.invoke_auto_assign_buoy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_res_date date;
  v_time_period varchar;
  v_uid uuid;
  v_url text;
begin
  -- 1. Determine context
  if (TG_OP = 'DELETE') then
    v_uid := OLD.uid;
    v_res_date := OLD.res_date;
  else
    v_uid := NEW.uid;
    v_res_date := NEW.res_date;
  end if;

  -- 2. Get time_period
  select time_period into v_time_period
  from public.res_openwater
  where uid = v_uid and res_date = v_res_date;

  -- 3. If valid, Insert/Update Queue
  if v_time_period is not null then
    -- Upsert into queue: If exists, reset to 'pending' so it gets picked up again
    insert into public.assignment_queue (res_date, time_period, status)
    values (v_res_date, v_time_period, 'pending')
    on conflict (res_date, time_period) 
    do update set status = 'pending', updated_at = now();

    -- 4. Signal Edge Function to process queue (Fire and Forget)
    -- We don't need to send the specific date/period, just "wake up"
    -- But sending it doesn't hurt.
    v_url := 'http://kong:8000/functions/v1/auto-assign-buoy'; 
    
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', current_setting('request.header.authorization', true)
      ),
      body := jsonb_build_object(
        'action', 'process_queue'
      )
    );
  end if;

  return null;
end;
$function$
;


