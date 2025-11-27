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
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@example.com', '$2a$10$7Q0m5Gk1VYv3J4g1k3pJc.dummyhashhashhashhashhashhashhash', now(), now(), now())
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
  ('00000000-0000-0000-0000-000000000005', 'Tina', 'Tina', array['user'])
on conflict (uid) do nothing;

-- Open Water reservations parent rows - COMMENTED OUT

with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (reservation_id, uid, res_date, res_type, res_status, created_at, updated_at)
values
  -- Use AM slot (08:00) for seeded open water reservations, reservation_id 1-20
  (1,  '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (2,  '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (3,  '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (4,  '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (5,  '55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (6,  '66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (7,  '77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (8,  '88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (9,  '99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (10, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (11, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (12, 'cccccccc-cccc-cccc-cccc-cccccccccccc', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (13, 'dddddddd-dddd-dddd-dddd-dddddddddddd', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (14, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (15, 'ffffffff-ffff-ffff-ffff-ffffffffffff', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (16, '00000000-0000-0000-0000-000000000001', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (17, '00000000-0000-0000-0000-000000000002', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (18, '00000000-0000-0000-0000-000000000003', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (19, '00000000-0000-0000-0000-000000000004', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now()),
  (20, '00000000-0000-0000-0000-000000000005', (select d1 from date_range) + interval '8 hours', 'open_water', 'pending', now(), now())
on conflict (uid, res_date) do nothing;


-- Open water detail rows (1 day total, 20 reservations) - COMMENTED OUT
-- AM slot only: 4 activity types x 5 divers each with appropriate depths

with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_openwater (
  reservation_id,
  uid, res_date, res_status, time_period, depth_m, buoy, auto_adjust_closest,
  pulley, bottom_plate, large_buoy, note, student_count, open_water_type
)
values
  -- AM (20 reservations) - 4 categories x 5 divers each
  -- 1) Course/Coaching (depth-agnostic; use varied depths)
  (1,  '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 20, null, true, false, false, false, null, 2, 'course_coaching'),
  (2,  '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 25, null, true, false, false, false, null, 3, 'course_coaching'),
  (3,  '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 28, null, true, false, false, false, null, 1, 'course_coaching'),
  (4,  '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 35, null, true, false, false, false, null, 3, 'course_coaching'),
  (5,  '55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 40, null, true, false, false, false, null, 2, 'course_coaching'),
  -- 2) Autonomous on Buoy (0-89m)
  (6,  '66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 30, null, true, false, false, false, null, null, 'autonomous_buoy'),
  (7,  '77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 31, null, true, false, false, false, null, null, 'autonomous_buoy'),
  (8,  '88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 32, null, true, false, false, false, null, null, 'autonomous_buoy'),
  (9,  '99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 33, null, true, false, false, false, null, null, 'autonomous_buoy'),
  (10, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 34, null, true, false, false, false, null, null, 'autonomous_buoy'),
  -- 3) Autonomous on Platform (0-99m)
  (11, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 80, null, true, false, false, false, null, null, 'autonomous_platform'),
  (12, 'cccccccc-cccc-cccc-cccc-cccccccccccc', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 81, null, true, false, false, false, null, null, 'autonomous_platform'),
  (13, 'dddddddd-dddd-dddd-dddd-dddddddddddd', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 82, null, true, false, false, false, null, null, 'autonomous_platform'),
  (14, 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 83, null, true, false, false, false, null, null, 'autonomous_platform'),
  (15, 'ffffffff-ffff-ffff-ffff-ffffffffffff', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 84, null, true, false, false, false, null, null, 'autonomous_platform'),
  -- 4) Autonomous on Platform +CBS (90-130m), reservation_id 16-20
  (16, '00000000-0000-0000-0000-000000000001', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 90, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  (17, '00000000-0000-0000-0000-000000000002', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 91, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  (18, '00000000-0000-0000-0000-000000000003', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 92, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  (19, '00000000-0000-0000-0000-000000000004', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 93, null, true, false, false, false, null, null, 'autonomous_platform_cbs'),
  (20, '00000000-0000-0000-0000-000000000005', (select d1 from date_range) + interval '8 hours', 'pending', 'AM', 94, null, true, false, false, false, null, null, 'autonomous_platform_cbs')
on conflict (uid, res_date) do nothing;


-- Pool reservations (PENDING, unassigned lane) to simulate lane capacity and overlap logic
-- Target test date (use next day to avoid timezone clashes)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (reservation_id, uid, res_date, res_type, res_status, created_at, updated_at)
values
  -- 8 overlapping pool reservations at 10:00-11:00 to simulate full capacity
  (21, '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (22, '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (23, '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (24, '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (25, '55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (26, '66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (27, '77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  (28, '88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '10 hours', 'pool', 'pending', now(), now()),
  -- 2 more non-overlapping slots for variety (11:00-12:00)
  (29, '99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '11 hours', 'pool', 'pending', now(), now()),
  (30, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '11 hours', 'pool', 'pending', now(), now())
on conflict (uid, res_date) do nothing;

-- Pool detail rows matching the above (lane intentionally NULL, pool_type mixes autonomous and course/coaching)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_pool (
  reservation_id,
  uid, res_date, res_status, start_time, end_time, lane, note, pool_type, student_count
)
values
  -- 10:00-11:00 block (8 overlapping), reservation_id 21-28
  (21, '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #1', 'autonomous', null),
  (22, '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #2', 'course_coaching', 2),
  (23, '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #3', 'autonomous', null),
  (24, '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #4', 'course_coaching', 1),
  (25, '55555555-5555-5555-5555-555555555555', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #5', 'autonomous', null),
  (26, '66666666-6666-6666-6666-666666666666', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #6', 'course_coaching', 3),
  (27, '77777777-7777-7777-7777-777777777777', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #7', 'autonomous', null),
  (28, '88888888-8888-8888-8888-888888888888', (select d1 from date_range) + interval '10 hours', 'pending', '10:00'::time, '11:00'::time, null, 'Seed: pool overlap #8', 'course_coaching', 2),
  -- 11:00-12:00 block (2 items), reservation_id 29-30
  (29, '99999999-9999-9999-9999-999999999999', (select d1 from date_range) + interval '11 hours', 'pending', '11:00'::time, '12:00'::time, null, 'Seed: pool next slot #1', 'autonomous', null),
  (30, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range) + interval '11 hours', 'pending', '11:00'::time, '12:00'::time, null, 'Seed: pool next slot #2', 'course_coaching', 1)
on conflict (uid, res_date) do nothing;

-- Classroom reservations (PENDING, unassigned room)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.reservations (reservation_id, uid, res_date, res_type, res_status, created_at, updated_at)
values
  (31, '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  (32, '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  (33, '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now()),
  (34, '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '9 hours', 'classroom', 'pending', now(), now())
on conflict (uid, res_date) do nothing;

-- Classroom detail rows matching the above (room intentionally NULL, classroom_type uses 'course_coaching')
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_classroom (
  reservation_id,
  uid, res_date, res_status, start_time, end_time, room, note, classroom_type, student_count
)
values
  (31, '11111111-1111-1111-1111-111111111111', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #1', 'course_coaching', 2),
  (32, '22222222-2222-2222-2222-222222222222', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #2', 'course_coaching', 3),
  (33, '33333333-3333-3333-3333-333333333333', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #3', 'course_coaching', 1),
  (34, '44444444-4444-4444-4444-444444444444', (select d1 from date_range) + interval '9 hours', 'pending', '09:00'::time, '11:00'::time, null, 'Seed: classroom auto-assign #4', 'course_coaching', 2)
on conflict (uid, res_date) do nothing;

-- Ensure the reservations sequence is ahead of seeded IDs to avoid collisions
select setval('public.reservations_reservation_id_seq', 1000, true);