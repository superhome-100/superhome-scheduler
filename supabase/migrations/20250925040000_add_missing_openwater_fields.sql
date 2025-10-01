-- Add missing openwater fields that are needed for the application

-- Add open_water_type field
alter table public.res_openwater 
add column if not exists open_water_type text;

-- Add student_count field  
alter table public.res_openwater 
add column if not exists student_count integer check (student_count is null or (student_count > 0 and student_count <= 3));

-- Add deep_fim_training field
alter table public.res_openwater 
add column if not exists deep_fim_training boolean not null default false;
