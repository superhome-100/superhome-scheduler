-- Seed data: 10 users and 10 open water reservations for testing auto-pairing
-- This script creates test data by temporarily disabling foreign key constraints

-- Temporarily disable foreign key constraints
SET session_replication_role = replica;

-- Insert 10 test users into auth.users (simplified approach without password encryption)
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES 
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user1@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user2@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user3@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user4@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user5@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('66666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user6@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user7@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user8@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user9@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'user10@example.com', NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, NOW());

-- Insert user profiles
INSERT INTO public.user_profiles (uid, name, status, privileges) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alice Johnson', 'active', ARRAY['user']),
  ('22222222-2222-2222-2222-222222222222', 'Bob Smith', 'active', ARRAY['user']),
  ('33333333-3333-3333-3333-333333333333', 'Carol Davis', 'active', ARRAY['user']),
  ('44444444-4444-4444-4444-444444444444', 'David Wilson', 'active', ARRAY['user']),
  ('55555555-5555-5555-5555-555555555555', 'Eva Brown', 'active', ARRAY['user']),
  ('66666666-6666-6666-6666-666666666666', 'Frank Miller', 'active', ARRAY['user']),
  ('77777777-7777-7777-7777-777777777777', 'Grace Taylor', 'active', ARRAY['user']),
  ('88888888-8888-8888-8888-888888888888', 'Henry Anderson', 'active', ARRAY['user']),
  ('99999999-9999-9999-9999-999999999999', 'Ivy Martinez', 'active', ARRAY['user']),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Jack Thompson', 'active', ARRAY['user']);

-- Insert 6 open water reservations with random depths and auto_adjust_closest = TRUE
-- All six slots PM on the same day for testing auto-pairing
-- 4 confirmed (unpaired), 1 pending, 1 confirmed (already paired)
INSERT INTO public.reservations (uid, res_date, res_type, res_status) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-10-01 13:00:00+00', 'open_water', 'confirmed'),
  ('22222222-2222-2222-2222-222222222222', '2025-10-01 13:00:00+00', 'open_water', 'confirmed'),
  ('33333333-3333-3333-3333-333333333333', '2025-10-01 13:00:00+00', 'open_water', 'confirmed'),
  ('44444444-4444-4444-4444-444444444444', '2025-10-01 13:00:00+00', 'open_water', 'confirmed'),
  ('55555555-5555-5555-5555-555555555555', '2025-10-01 13:00:00+00', 'open_water', 'pending'),
  ('66666666-6666-6666-6666-666666666666', '2025-10-01 13:00:00+00', 'open_water', 'confirmed');

-- Insert open water details with random depths (5-50 meters) and auto_adjust_closest = TRUE
-- Note: Users 1 and 6 are pre-paired to test the "already paired" scenario
INSERT INTO public.res_openwater (uid, res_date, res_status, time_period, depth_m, auto_adjust_closest, paired_uid, paired_at, note) VALUES
  ('11111111-1111-1111-1111-111111111111', '2025-10-01 13:00:00+00', 'confirmed', 'PM', 24, true, '66666666-6666-6666-6666-666666666666', NOW(), 'Afternoon dive session (pre-paired)'),
  ('22222222-2222-2222-2222-222222222222', '2025-10-01 13:00:00+00', 'confirmed', 'PM', 30, true, NULL, NULL, 'Afternoon deep dive (unpaired)'),
  ('33333333-3333-3333-3333-333333333333', '2025-10-01 13:00:00+00', 'confirmed', 'PM', 38, true, NULL, NULL, 'Afternoon advanced dive (unpaired)'),
  ('44444444-4444-4444-4444-444444444444', '2025-10-01 13:00:00+00', 'confirmed', 'PM', 32, true, NULL, NULL, 'Afternoon intermediate dive (unpaired)'),
  ('55555555-5555-5555-5555-555555555555', '2025-10-01 13:00:00+00', 'pending', 'PM', 25, true, NULL, NULL, 'Afternoon pending dive'),
  ('66666666-6666-6666-6666-666666666666', '2025-10-01 13:00:00+00', 'confirmed', 'PM', 26, true, '11111111-1111-1111-1111-111111111111', NOW(), 'Afternoon paired dive (pre-paired)');

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;