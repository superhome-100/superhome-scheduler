Impersonate User in SQL Editor & Duplicate Seed Data
Test monthly totals using your own user ID but with Randy’s reservation data.

Set Up Your User ID (replace `YOUR-UID`)
```sql
-- Set your uid explicitly for all queries in this session
WITH my_uid AS (
SELECT 'YOUR-UID'::uuid AS uid
)
UPDATE public.user_profiles
SET price_template_name = 'regular'
WHERE uid = (SELECT uid FROM my_uid);
```

Duplicate Randy’s Reservations to Your User

Reservations Table
```sql
WITH my_uid AS (
SELECT 'YOUR-UID'::uuid AS uid
)
INSERT INTO public.reservations (uid, res_date, res_type, res_status, created_at, updated_at)
SELECT (SELECT uid FROM my_uid), r.res_date, r.res_type, r.res_status, now(), now()
FROM public.reservations r
WHERE r.uid = 'YOUR-UID'
AND r.res_date::date <= current_date
AND NOT EXISTS (
SELECT 1 FROM public.reservations r2
WHERE r2.uid = (SELECT uid FROM my_uid) AND r2.res_date = r.res_date
);
```

Pool Details
```sql
WITH my_uid AS (
SELECT 'YOUR-UID'::uuid AS uid
)
INSERT INTO public.res_pool (uid, res_date, res_status, start_time, end_time, lane, note, pool_type, student_count)
SELECT (SELECT uid FROM my_uid), p.res_date, p.res_status, p.start_time, p.end_time, p.lane, p.note, p.pool_type, p.student_count
FROM public.res_pool p
JOIN public.reservations r ON r.uid = p.uid AND r.res_date = p.res_date
WHERE p.uid = 'YOUR-UID'
AND p.res_date::date <= current_date
AND EXISTS (
SELECT 1 FROM public.reservations r2 WHERE r2.uid = (SELECT uid FROM my_uid) AND r2.res_date = p.res_date
)
AND NOT EXISTS (
SELECT 1 FROM public.res_pool p2 WHERE p2.uid = (SELECT uid FROM my_uid) AND p2.res_date = p.res_date
);
```

Open Water Details
```sql
WITH my_uid AS (
SELECT 'YOUR-UID'::uuid AS uid
)
INSERT INTO public.res_openwater (
uid, res_date, res_status, time_period, depth_m, buoy,
pulley, bottom_plate, large_buoy, note, student_count, open_water_type, deep_fim_training
)
SELECT (SELECT uid FROM my_uid), o.res_date, o.res_status, o.time_period, o.depth_m, o.buoy,
o.pulley, o.bottom_plate, o.large_buoy, o.note, o.student_count, o.open_water_type, o.deep_fim_training
FROM public.res_openwater o
JOIN public.reservations r ON r.uid = o.uid AND r.res_date = o.res_date
WHERE o.uid = 'YOUR-UID'
AND o.res_date::date <= current_date
AND EXISTS (
SELECT 1 FROM public.reservations r2 WHERE r2.uid = (SELECT uid FROM my_uid) AND r2.res_date = o.res_date
)
AND NOT EXISTS (
SELECT 1 FROM public.res_openwater o2 WHERE o2.uid = (SELECT uid FROM my_uid) AND o2.res_date = o.res_date
);
```

Classroom Details
```sql
WITH my_uid AS (
SELECT 'YOUR-UID'::uuid AS uid
)
INSERT INTO public.res_classroom (
uid, res_date, res_status, start_time, end_time, room, note, classroom_type, student_count
)
SELECT (SELECT uid FROM my_uid), c.res_date, c.res_status, c.start_time, c.end_time, c.room, c.note, c.classroom_type, c.student_count
FROM public.res_classroom c
JOIN public.reservations r ON r.uid = c.uid AND r.res_date = c.res_date
WHERE c.uid = 'YOUR-UID'
AND c.res_date::date <= current_date
AND EXISTS (
SELECT 1 FROM public.reservations r2 WHERE r2.uid = (SELECT uid FROM my_uid) AND r2.res_date = c.res_date
)
AND NOT EXISTS (
SELECT 1 FROM public.res_classroom c2 WHERE c2.uid = (SELECT uid FROM my_uid) AND c2.res_date = c.res_date
);
```

Verify Monthly Totals Computation

Run this query to check the monthly totals:
```sql
SELECT * FROM public.compute_monthly_completed_totals(
date '2025-10-01', date '2025-12-01'
);
```