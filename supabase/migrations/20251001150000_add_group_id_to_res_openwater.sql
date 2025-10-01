-- Add group_id field to res_openwater table to link reservations to buoy groups
set search_path = public;

-- Add group_id column to res_openwater table
alter table public.res_openwater 
add column if not exists group_id integer references public.buoy_group(id) on delete set null;

-- Add index for better query performance
create index if not exists res_openwater_group_id_idx on public.res_openwater (group_id);

-- Add comment to document the relationship
comment on column public.res_openwater.group_id is 'Foreign key to buoy_group.id - links reservation to assigned buoy group';

-- Update existing reservations to link them to their buoy groups if they exist
-- This will backfill the group_id for existing reservations that are already assigned to groups
-- Note: This will be handled by the subsequent migration that migrates from buoy_group_members
