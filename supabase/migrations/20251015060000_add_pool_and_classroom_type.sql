-- Add pool_type to res_pool and classroom_type to res_classroom
set search_path = public;

-- res_pool: add pool_type (text) for categorizing pool reservations (e.g., training, lap, coaching)
alter table if exists public.res_pool
  add column if not exists pool_type text;

comment on column public.res_pool.pool_type is 'Type/category of pool reservation (e.g., training, lap, coaching)';

-- res_classroom: add classroom_type (text) for categorizing classroom reservations (e.g., lecture, workshop, exam)
alter table if exists public.res_classroom
  add column if not exists classroom_type text;

comment on column public.res_classroom.classroom_type is 'Type/category of classroom reservation (e.g., lecture, workshop, exam)';
