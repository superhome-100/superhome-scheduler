-- Remove paired_at and paired_uid fields from res_openwater table
-- These fields are no longer needed for the pairing system

-- First, drop any policies that depend on these columns
drop policy if exists "user_profiles_select_when_paired" on public.user_profiles;

-- Drop functions that depend on paired fields
drop function if exists public.auto_pair_open_water(uuid, timestamptz);
drop function if exists public.get_openwater_pair_info(uuid, timestamptz);

-- Drop indexes that depend on paired fields
drop index if exists public.res_openwater_paired_uid_idx;

-- Drop the paired_at column
alter table public.res_openwater 
drop column if exists paired_at;

-- Drop the paired_uid column  
alter table public.res_openwater 
drop column if exists paired_uid;
