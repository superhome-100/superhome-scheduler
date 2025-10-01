-- Seed users, profiles, and open water reservations for testing auto-assign buoy
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
insert into public.user_profiles (uid, name, privileges)
values
  ('00000000-0000-0000-0000-000000000006', 'Admin', array['admin','user']),
  ('11111111-1111-1111-1111-111111111111', 'Alice', array['user']),
  ('22222222-2222-2222-2222-222222222222', 'Bob', array['user']),
  ('33333333-3333-3333-3333-333333333333', 'Carol', array['user']),
  ('44444444-4444-4444-4444-444444444444', 'Dave', array['user']),
  ('55555555-5555-5555-5555-555555555555', 'Erin', array['user']),
  ('66666666-6666-6666-6666-666666666666', 'Frank', array['user']),
  ('77777777-7777-7777-7777-777777777777', 'Grace', array['user']),
  ('88888888-8888-8888-8888-888888888888', 'Henry', array['user']),
  ('99999999-9999-9999-9999-999999999999', 'Ivy', array['user']),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jack', array['user']),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Kate', array['user']),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Leo', array['user']),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Mia', array['user']),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Nick', array['user']),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Olivia', array['user']),
  ('00000000-0000-0000-0000-000000000001', 'Peter', array['user']),
  ('00000000-0000-0000-0000-000000000002', 'Quinn', array['user']),
  ('00000000-0000-0000-0000-000000000003', 'Rachel', array['user']),
  ('00000000-0000-0000-0000-000000000004', 'Sam', array['user']),
  ('00000000-0000-0000-0000-000000000005', 'Tina', array['user'])
on conflict (uid) do nothing;

-- Target test date (use next day to avoid timezone clashes)
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
-- Reservations parent rows (pending open_water) - 20 total (1 day)
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

-- Open water detail rows (1 day total, 20 reservations)
-- AM slot only: 15 with close depths ~30-34m, 5 with close depths ~60-64m
with date_range as (
  select (now() at time zone 'utc')::date + 1 as d1
)
insert into public.res_openwater (
  uid, res_date, res_status, time_period, depth_m, buoy, auto_adjust_closest,
  pulley, bottom_plate, large_buoy, note, open_water_type
)
values
  -- AM (20 reservations) - first 15 close depths ~30-34m, last 5 close depths ~60-64m
  ('11111111-1111-1111-1111-111111111111', (select d1 from date_range), 'pending', 'AM', 30, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('22222222-2222-2222-2222-222222222222', (select d1 from date_range), 'pending', 'AM', 31, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('33333333-3333-3333-3333-333333333333', (select d1 from date_range), 'pending', 'AM', 32, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('44444444-4444-4444-4444-444444444444', (select d1 from date_range), 'pending', 'AM', 33, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('55555555-5555-5555-5555-555555555555', (select d1 from date_range), 'pending', 'AM', 34, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('66666666-6666-6666-6666-666666666666', (select d1 from date_range), 'pending', 'AM', 30, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('77777777-7777-7777-7777-777777777777', (select d1 from date_range), 'pending', 'AM', 31, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('88888888-8888-8888-8888-888888888888', (select d1 from date_range), 'pending', 'AM', 32, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('99999999-9999-9999-9999-999999999999', (select d1 from date_range), 'pending', 'AM', 33, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', (select d1 from date_range), 'pending', 'AM', 34, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', (select d1 from date_range), 'pending', 'AM', 30, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', (select d1 from date_range), 'pending', 'AM', 31, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', (select d1 from date_range), 'pending', 'AM', 32, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', (select d1 from date_range), 'pending', 'AM', 33, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', (select d1 from date_range), 'pending', 'AM', 34, null, true, false, false, false, 'Intermediate', 'Autonomous on Buoy (0-89m)'),
  ('00000000-0000-0000-0000-000000000001', (select d1 from date_range), 'pending', 'AM', 60, null, true, false, false, false, 'Advanced', 'Autonomous on Buoy (0-89m)'),
  ('00000000-0000-0000-0000-000000000002', (select d1 from date_range), 'pending', 'AM', 61, null, true, false, false, false, 'Advanced', 'Autonomous on Buoy (0-89m)'),
  ('00000000-0000-0000-0000-000000000003', (select d1 from date_range), 'pending', 'AM', 62, null, true, false, false, false, 'Advanced', 'Autonomous on Buoy (0-89m)'),
  ('00000000-0000-0000-0000-000000000004', (select d1 from date_range), 'pending', 'AM', 63, null, true, false, false, false, 'Advanced', 'Autonomous on Buoy (0-89m)'),
  ('00000000-0000-0000-0000-000000000005', (select d1 from date_range), 'pending', 'AM', 64, null, true, false, false, false, 'Advanced', 'Autonomous on Buoy (0-89m)')
on conflict (uid, res_date) do nothing;