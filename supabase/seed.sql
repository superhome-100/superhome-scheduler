-- Seed users, profiles, pool, and classroom reservations for testing
-- Open Water reservations are commented out as per requirements
set search_path = public;

-- Use fixed UUIDs for reproducibility
-- Auth users (local dev allows inserting into auth schema during seed)
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dave@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'erin@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'frank@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'grace@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'henry@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'ivy@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jack@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'kate@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'leo@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'mia@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'nick@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'olivia@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'peter@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'quinn@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rachel@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'sam@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'tina@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
  ('8b7c6991-a4fe-4952-a079-e68d3de9f2b0', '8b7c6991-a4fe-4952-a079-e68d3de9f2b0', 'authenticated', 'authenticated', 'get.neilmolina@gmail.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now()),
on conflict (id) do nothing;

-- Profiles (admin + users)
insert into public.user_profiles (uid, name, nickname, privileges)
values
  ('00000000-0000-0000-0000-000000000006', 'Admin', 'Admin', array['admin','user']),
  ('11111111-1111-1111-1111-111111111111', 'Alice', 'Alice', array['user']),
  ('22222222-2222-2222-2222-222222222222', 'Bob', 'Bob', array['user']),
  ('33333333-3333-3333-3333-333333333333', 'Carol', 'Carol', array['user']),
  ('44444444-4444-4444-4444-444444444444', 'Dave', 'Dave', array['user']),
  ('55555555-5555-5555-5555-555555555555', 'Erin', 'Erin', array['user']),
  ('66666666-6666-6666-6666-666666666666', 'Frank', 'Frank', array['user']),
  ('77777777-7777-7777-7777-777777777777', 'Grace', 'Grace', array['user']),
  ('88888888-8888-8888-8888-888888888888', 'Henry', 'Henry', array['user']),
  ('99999999-9999-9999-9999-999999999999', 'Ivy', 'Ivy', array['user']),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jack', 'Jack', array['user']),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kate', 'Kate', array['user']),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Leo', 'Leo', array['user']),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Mia', 'Mia', array['user']),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nick', 'Nick', array['user']),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Olivia', 'Olivia', array['user']),
  ('00000000-0000-0000-0000-000000000001', 'Peter', 'Peter', array['user']),
  ('00000000-0000-0000-0000-000000000002', 'Quinn', 'Quinn', array['user']),
  ('00000000-0000-0000-0000-000000000003', 'Rachel', 'Rachel', array['user']),
  ('00000000-0000-0000-0000-000000000004', 'Sam', 'Sam', array['user']),
  ('00000000-0000-0000-0000-000000000005', 'Tina', 'Tina', array['user']),
  ('8b7c6991-a4fe-4952-a079-e68d3de9f2b0', 'Neil Molina', 'Neil Molina', array['admin'])
on conflict (uid) do nothing;

-- Open Water reservations parent rows - COMMENTED OUT

-- Target test date (use next day to avoid timezone clashes)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (uid, res_date, res_type, res_status, created_at, updated_at)
select uid, res_date, 'open_water', 'pending', now(), now()
from (
  select '11111111-1111-1111-1111-111111111111'::uuid as uid, (select d1 from date_range)::timestamptz as res_date union all
  select '22222222-2222-2222-2222-222222222222'::uuid, (select d1 from date_range) union all
  select '33333333-3333-3333-3333-333333333333'::uuid, (select d1 from date_range) union all
  select '44444444-4444-4444-4444-444444444444'::uuid, (select d1 from date_range) union all
  select '55555555-5555-5555-5555-555555555555'::uuid, (select d1 from date_range) union all
  select '66666666-6666-6666-6666-666666666666'::uuid, (select d1 from date_range) union all
  select '77777777-7777-7777-7777-777777777777'::uuid, (select d1 from date_range) union all
  select '88888888-8888-8888-8888-888888888888'::uuid, (select d1 from date_range) union all
  select '99999999-9999-9999-9999-999999999999'::uuid, (select d1 from date_range) union all
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, (select d1 from date_range) union all
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, (select d1 from date_range) union all
  select 'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, (select d1 from date_range) union all
  select 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, (select d1 from date_range) union all
  select 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, (select d1 from date_range) union all
  select 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, (select d1 from date_range) union all
  select '00000000-0000-0000-0000-000000000001'::uuid, (select d1 from date_range) union all
  select '00000000-0000-0000-0000-000000000002'::uuid, (select d1 from date_range) union all
  select '00000000-0000-0000-0000-000000000003'::uuid, (select d1 from date_range) union all
  select '00000000-0000-0000-0000-000000000004'::uuid, (select d1 from date_range) union all
  select '00000000-0000-0000-0000-000000000005'::uuid, (select d1 from date_range)
) t(uid, res_date)
on conflict do nothing;


-- Open water detail rows (1 day total, 20 reservations) - COMMENTED OUT
-- AM slot only: 4 activity types x 5 divers each with appropriate depths

with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_openwater (
  uid, res_date, res_status, time_period, depth_m, buoy, auto_adjust_closest,
  pulley, bottom_plate, large_buoy, note, student_count, open_water_type
)
values
  -- AM (20 reservations) - 4 categories x 5 divers each
  -- 1) Course/Coaching (depth-agnostic; use varied depths)
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range), 'pending', 'AM', 20, null, true, false, false, false, null, 2, 'course_coaching'),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range), 'pending', 'AM', 25, null, true, false, false, false, null, 3, 'course_coaching'),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range), 'pending', 'AM', 28, null, true, false, false, false, null, 1, 'course_coaching'),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range), 'pending', 'AM', 35, null, true, false, false, false, null, 3, 'course_coaching'),
  ('55555555-5555-5555-5555-555555555555', (select d1 from date_range), 'pending', 'AM', 40, null, true, false, false, false, null, 2, 'course_coaching'),
  -- 2) Autonomous on Buoy (0-89m)
  ('66666666-6666-6666-6666-666666666666', (select d1 from date_range), 'pending', 'AM', 30, null, true, false, false, false, null, null, 'autonomous_buoy'),
  ('77777777-7777-7777-7777-777777777777', (select d1 from date_range), 'pending', 'AM', 31, null, true, false, false, false, null, null, 'autonomous_buoy'),
  ('88888888-8888-8888-8888-888888888888', (select d1 from date_range), 'pending', 'AM', 32, null, true, false, false, false, null, null, 'autonomous_buoy'),
  ('99999999-9999-9999-9999-999999999999', (select d1 from date_range), 'pending', 'AM', 33, null, true, false, false, false, null, null, 'autonomous_buoy'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range), 'pending', 'AM', 34, null, true, false, false, false, null, null, 'autonomous_buoy'),
  -- 3) Autonomous on Platform (0-99m)
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select d1 from date_range), 'pending', 'AM', 80, null, true, false, false, false, null, null, 'autonomous_platform'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', (select d1 from date_range), 'pending', 'AM', 81, null, true, false, false, false, null, null, 'autonomous_platform'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', (select d1 from date_range), 'pending', 'AM', 82, null, true, false, false, false, null, null, 'autonomous_platform'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (select d1 from date_range), 'pending', 'AM', 83, null, true, false, false, false, null, null, 'autonomous_platform'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', (select d1 from date_range), 'pending', 'AM', 84, null, true, false, false, false, null, null, 'autonomous_platform'),
  -- 4) Autonomous on Platform +CBS (90-130m)
  ('00000000-0000-0000-0000-000000000001', (select d1 from date_range), 'pending', 'AM', 90, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  ('00000000-0000-0000-0000-000000000002', (select d1 from date_range), 'pending', 'AM', 91, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  ('00000000-0000-0000-0000-000000000003', (select d1 from date_range), 'pending', 'AM', 92, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  ('00000000-0000-0000-0000-000000000004', (select d1 from date_range), 'pending', 'AM', 93, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  ('00000000-0000-0000-0000-000000000005', (select d1 from date_range), 'pending', 'AM', 94, null, true, false, false, false, null, null, 'autonomous_platform_cbs')
on conflict (uid, res_date) do nothing;


-- Pool reservations (PENDING, unassigned lane) to simulate lane capacity and overlap logic
-- Target test date (use next day to avoid timezone clashes)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (uid, res_date, res_type, res_status, created_at, updated_at)
values
  -- 8 overlapping pool reservations at 10:00-11:00 to simulate full capacity
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  ('88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  -- 2 more non-overlapping slots for variety (11:00-12:00)
  ('99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '11 hours', 'pool', 'pending', now(), now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '11 hours', 'pool', 'pending', now(), now())
on conflict do nothing;

-- Pool detail rows matching the above (lane intentionally NULL, pool_type mixes autonomous and course/coaching)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_pool (
  uid, res_date, res_status, start_time, end_time, lane, note, pool_type, student_count
)
values
  -- 10:00-11:00 block (8 overlapping)
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #1', 'autonomous', null),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #2', 'course_coaching', 2),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #3', 'autonomous', null),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #4', 'course_coaching', 1),
  ('55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #5', 'autonomous', null),
  ('66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #6', 'course_coaching', 3),
  ('77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #7', 'autonomous', null),
  ('88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #8', 'course_coaching', 2),
  -- 11:00-12:00 block (2 items)
  ('99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '11 hours', 'pending', '11:00'::time, '12:00'::time, null, 'Seed: pool next slot #1', 'autonomous', null),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '11 hours', 'pending', '11:00'::time, '12:00'::time, null, 'Seed: pool next slot #2', 'course_coaching', 1)
on conflict (uid, res_date) do nothing;

-- Classroom reservations (PENDING, unassigned room)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (uid, res_date, res_type, res_status, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now())
on conflict do nothing;

-- Classroom detail rows matching the above (room intentionally NULL, classroom_type uses 'course_coaching')
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_classroom (
  uid, res_date, res_status, start_time, end_time, room, note, classroom_type, student_count
)
values
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #1', 'course_coaching', 2),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #2', 'course_coaching', 3),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #3', 'course_coaching', 1),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #4', 'course_coaching', 2)
on conflict (uid, res_date) do nothing;