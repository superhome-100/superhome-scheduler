-- Add 'cancelled' status to reservation_status enum and keep child tables in sync
-- IMPORTANT: After running this migration, regenerate types per project rules.

begin;

-- Add to main enum (schema-qualified) if not already present
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_enum e on t.oid = e.enumtypid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'reservation_status'
      and e.enumlabel = 'cancelled'
  ) then
    alter type public.reservation_status add value 'cancelled';
  end if;
end $$;

-- Child tables reference the same enum; no further changes required

commit;
