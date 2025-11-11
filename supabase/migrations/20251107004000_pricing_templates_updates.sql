-- Pricing templates + updates migration
-- Aligns with plans/PRICING_TEMPLATES_UPDATES_PLAN.md
-- Creates: public.price_templates, public.price_template_updates
-- Adds: public.user_profiles.price_template_name (FK -> price_templates.name)
-- Enables strict RLS (read-only for authenticated via policies; mutations via Edge Functions/service role)

BEGIN;

-- 1) price_templates
CREATE TABLE IF NOT EXISTS public.price_templates (
  name TEXT PRIMARY KEY,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) price_template_updates (append-only changelog)
CREATE TABLE IF NOT EXISTS public.price_template_updates (
  id TEXT PRIMARY KEY,
  price_template_name TEXT NOT NULL REFERENCES public.price_templates(name) ON DELETE CASCADE,
  coach_ow INTEGER NOT NULL,
  coach_pool INTEGER NOT NULL,
  coach_classroom INTEGER NOT NULL,
  auto_ow INTEGER NOT NULL,
  auto_pool INTEGER NOT NULL,
  platform_ow INTEGER NOT NULL,
  platformcbs_ow INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful index to fetch latest update quickly
CREATE INDEX IF NOT EXISTS idx_price_template_updates_template_name_created
  ON public.price_template_updates(price_template_name, created_at);

-- 3) Attach business code to user profiles (substitute for old_app PriceTemplates.id)
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS price_template_name TEXT
  REFERENCES public.price_templates(name);

-- 4) Add price column to reservations (nullable; non-negative). Strict RLS remains enforced on table.
--     Mutations should be performed via Edge Functions / service role per project rules.
ALTER TABLE IF EXISTS public.reservations
  ADD COLUMN IF NOT EXISTS price INTEGER CHECK (price IS NULL OR price >= 0);

-- RLS: enable strict RLS, allow SELECT to authenticated; CUD via Edge Functions/service_role only
ALTER TABLE public.price_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_template_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'price_templates' AND p.policyname = 'price_templates_select'
  ) THEN
    CREATE POLICY price_templates_select
      ON public.price_templates FOR SELECT
      TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public' AND p.tablename = 'price_template_updates' AND p.policyname = 'price_template_updates_select'
  ) THEN
    CREATE POLICY price_template_updates_select
      ON public.price_template_updates FOR SELECT
      TO authenticated USING (true);
  END IF;
END$$;

COMMIT;

-- After applying this migration, regenerate TypeScript types per project rules:
-- supabase gen types typescript --project-id <pid> --schema public > app/src/lib/types/supabase.ts
