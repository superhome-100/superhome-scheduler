-- Allow AM and PM as valid type values for open_water in availabilities table
-- This supports marking AM/PM slots as full (unavailable)
set search_path = public;

alter table if exists public.availabilities
  drop constraint if exists availabilities_type_per_category_check;

alter table if exists public.availabilities
  add constraint availabilities_type_per_category_check
  check (
    type is null
    or (
      (category = 'pool' and type in (
        'Autonomous',
        'Course/Coaching'
      ))
      or (category = 'open_water' and type in (
        'Course/Coaching',
        'Autonomous on Buoy',
        'Autonomous on Platform',
        'Autonomous on Platform + CBS',
        'AM',
        'PM'
      ))
      or (category = 'classroom' and type in (
        'Course/Coaching'
      ))
    )
  );
