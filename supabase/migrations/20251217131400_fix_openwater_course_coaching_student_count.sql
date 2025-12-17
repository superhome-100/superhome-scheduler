-- Fix: allow Open Water Course/Coaching to have >3 students
-- Existing constraint limited student_count to <= 3 for all open water types.

set search_path = public;

begin;

-- The original column was created with an inline CHECK constraint which defaults to this name.
alter table if exists public.res_openwater
  drop constraint if exists res_openwater_student_count_check;

-- Allow up to 10 students for course_coaching, keep <=3 for other open water types.
alter table if exists public.res_openwater
  add constraint res_openwater_student_count_check
  check (
    student_count is null
    or (
      student_count > 0
      and (
        (open_water_type = 'course_coaching' and student_count <= 5)
        or ((open_water_type is null or open_water_type <> 'course_coaching') and student_count <= 3)
      )
    )
  );

commit;
