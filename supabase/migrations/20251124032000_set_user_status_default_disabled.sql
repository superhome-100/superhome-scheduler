-- Set default status for new user profiles to 'disabled'
set search_path = public;

-- Ensure enum exists (from initial migration): user_status ('active','disabled')
-- Do NOT recreate; just change default on the column.
alter table if exists public.user_profiles
  alter column status set default 'disabled';

comment on column public.user_profiles.status is 'User status: active or disabled (default disabled for new users)';
