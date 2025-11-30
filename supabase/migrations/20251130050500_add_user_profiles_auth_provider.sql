-- Migration: add auth_provider to user_profiles
-- Follows rules: strict RLS, check enum before creating a new one (use check constraint instead)
-- File created at 2025-11-30 05:05 UTC

begin;

-- Add column if not exists
alter table if exists public.user_profiles
  add column if not exists auth_provider text;

-- Add a CHECK constraint to limit values to known providers
-- Use a conditional name to avoid duplicate constraint creation
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_profiles_auth_provider_chk'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_auth_provider_chk
      check (auth_provider is null or auth_provider in ('google','facebook'));
  end if;
end $$;

-- Optional: backfill is not possible from auth schema on client; will be set on next login via app logic

commit;
