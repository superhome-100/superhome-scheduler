-- Update availabilities: rename columns and enforce category/type mapping
set search_path = public;

-- 1) Rename existing columns
--    - "category" (TEXT) becomes "type" (TEXT)
--    - "res_type" (reservation_type) becomes "category" (reservation_type)
--       Order matters to avoid name collision
alter table if exists public.availabilities
  rename column category to type;

alter table if exists public.availabilities
  rename column res_type to category;

-- 2) Comments reflecting the new meaning
comment on column public.availabilities.category is 'Reservation category (reservation_type enum): pool | open_water | classroom';
comment on column public.availabilities.type is 'Specific type within the category, validated by a CHECK constraint';

-- 3) Recreate UNIQUE constraint using (date, category, type)
--    Drop the old unique if it exists (autonamed from initial migration)
alter table if exists public.availabilities
  drop constraint if exists availabilities_date_res_type_category_key;

alter table if exists public.availabilities
  add constraint availabilities_date_category_type_key unique(date, category, type);

-- 4) Rebuild lookup index to use new column names
--    Old: idx_availabilities_lookup on (date, res_type, category)
--    Drop and recreate with (date, category, type)
 drop index if exists public.idx_availabilities_lookup;
create index if not exists idx_availabilities_lookup
  on public.availabilities(date, category, type);

-- 5) Add a CHECK constraint to validate type values per category
--    Note: Keeping type nullable for now; when populated, it must match a valid value
alter table if exists public.availabilities
  add constraint availabilities_type_per_category_check
  check (
    type is null
    or (
      (category = 'pool' and type in (
        'Autonomous',
        'Course/Coaching'
      ))
      or (category = 'open_water' and type in (
        'Course/Coaching',
        'Autonomous on Buoy',
        'Autonomous on Platform',
        'Autonomous on Platform + CBS'
      ))
      or (category = 'classroom' and type in (
        'Course/Coaching'
      ))
    )
  );
