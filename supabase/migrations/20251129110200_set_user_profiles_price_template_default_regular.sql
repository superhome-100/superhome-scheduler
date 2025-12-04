-- Set default price template to 'regular' for user_profiles
-- Ensures first-time logins get the default without client involvement
-- Follows project rules: strict RLS with DB defaults; do not delete migrations

BEGIN;

-- Safety: ensure the 'regular' template exists (idempotent)
INSERT INTO public.price_templates(name, description)
VALUES ('regular', 'Default pricing')
ON CONFLICT (name) DO NOTHING;

-- Set a database-level DEFAULT so inserts that omit the column get 'regular'
ALTER TABLE IF EXISTS public.user_profiles
  ALTER COLUMN price_template_name SET DEFAULT 'regular';

-- Backfill any existing NULLs to 'regular' so pricing works consistently
UPDATE public.user_profiles
SET price_template_name = 'regular'
WHERE price_template_name IS NULL;

COMMIT;

-- Per project rules, regenerate TS types after applying this migration:
-- supabase gen types typescript --schema public > app/src/lib/database.types.ts
