# Pricing Templates + Updates Migration Plan

## Overview
This plan proposes a new pricing model using two normalized tables:

- price_templates: Master records for pricing tags (e.g., regular, vip1, vip2, in_house).
- price_template_updates: Append-only changelog of price rows per template; admins can keep adding new updates over time.

Relationship: One price_templates to many price_template_updates.

This replaces the single-table template approach from `plans/PRICING_INTEGRATION_PLAN.md` while preserving user rules:

- No realtime; enforce pull-to-refresh.
- Strict RLS for all tables.
- All CREATE/UPDATE/DELETE via Edge Functions with CORS using `_shared`.
- Regenerate types on every migration (type strictness).
- Mobile-first UI; reusable models/stores; keep files < 300 lines.
- Check existing enums before introducing new ones (we keep numeric columns; no new enums).

## Schema Design

1) price_templates
- name TEXT PRIMARY KEY (acts as human-readable tag: regular, vip1, vip2, etc.)
- id TEXT NOT NULL (external/business identifier if needed; not the primary key)
- description TEXT NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()

2) price_template_updates
- id TEXT PRIMARY KEY (e.g., ULIDs/KSUIDs/UUID-as-text; generated server-side)
- price_template_name TEXT NOT NULL REFERENCES price_templates(name) ON DELETE CASCADE
- coach_ow INTEGER NOT NULL
- coach_pool INTEGER NOT NULL
- coach_classroom INTEGER NOT NULL
- auto_ow INTEGER NOT NULL
- auto_pool INTEGER NOT NULL
- cbs_ow INTEGER NOT NULL
- prosafety_ow INTEGER NOT NULL
- platform_ow INTEGER NOT NULL
- platformcbs_ow INTEGER NOT NULL
- compsetup_ow INTEGER NOT NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT now()

Notes
- We reference price_templates by name to keep admin UX straightforward and allow stable tags.
- If later we need immutable numeric PKs, we can add a surrogate key but keep name unique.

## Migration SQL (public schema)
Add a new migration under `supabase/migrations/` with a timestamped filename, e.g., `YYYYMMDDHHMM_new_pricing_templates_updates.sql` containing:

```sql
-- Create price_templates table
CREATE TABLE IF NOT EXISTS public.price_templates (
  name TEXT PRIMARY KEY,
  id TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_template_updates table
CREATE TABLE IF NOT EXISTS public.price_template_updates (
  id TEXT PRIMARY KEY,
  price_template_name TEXT NOT NULL REFERENCES public.price_templates(name) ON DELETE CASCADE,
  coach_ow INTEGER NOT NULL,
  coach_pool INTEGER NOT NULL,
  coach_classroom INTEGER NOT NULL,
  auto_ow INTEGER NOT NULL,
  auto_pool INTEGER NOT NULL,
  cbs_ow INTEGER NOT NULL,
  prosafety_ow INTEGER NOT NULL,
  platform_ow INTEGER NOT NULL,
  platformcbs_ow INTEGER NOT NULL,
  compsetup_ow INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_price_template_updates_template_name
  ON public.price_template_updates(price_template_name, created_at DESC);

-- Ensure business code `id` is unique for FK usage from user_profiles
ALTER TABLE public.price_templates
  ADD CONSTRAINT IF NOT EXISTS price_templates_id_unique UNIQUE (id);

-- Add price_template_id (TEXT) to user_profiles referencing price_templates(id)
-- This substitutes old_app PriceTemplates.id and will be the primary join key
ALTER TABLE IF EXISTS public.user_profiles
  ADD COLUMN IF NOT EXISTS price_template_id TEXT
  REFERENCES public.price_templates(id);
```

## RLS Policies (Strict)
Enable RLS and create guarded policies:

```sql
ALTER TABLE public.price_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_template_updates ENABLE ROW LEVEL SECURITY;

-- price_templates
CREATE POLICY price_templates_select
  ON public.price_templates FOR SELECT
  TO authenticated USING (true);

-- Admin-only mutations via Edge Functions (service_role)
-- Optionally, add a policy for a custom admin role claim if needed for local tools.

-- price_template_updates
CREATE POLICY price_template_updates_select
  ON public.price_template_updates FOR SELECT
  TO authenticated USING (true);
```

Grants
- Do NOT grant INSERT/UPDATE/DELETE to anon/authenticated directly.
- Edge Functions run with service_role; they can bypass RLS or be given explicit grants as needed.

## CRUD and Pricing Functions (Edge Functions)
Follow the `_shared` CORS pattern (see `supabase/functions/reservations-create/index.ts`). All CUD uses Edge Functions.

1) price-templates-crud
- Create: insert into price_templates
- Update: update description or id for a given name
- Delete: delete by name (cascades updates)

2) price-template-updates-create
- Create a new row in price_template_updates for a given price_template_name
- No updates/deletes to changelog rows by default to preserve an audit trail

3) pricing-run
- Adjust the pricing job from `PRICING_INTEGRATION_PLAN` to fetch the latest price row per template at reservation date (or simply latest by created_at if no effective-dating is required).
- Steps
  - For each user, join user_profiles.price_template_name to price_templates, then to latest price_template_updates row.
  - Compute reservation.price based on reservation category/type mapping (same mapping keys as legacy: coach_ow, auto_ow, etc.).
  - Apply monthly cap rules for OW autonomous where applicable.
  - Update reservations.price in batch.

CORS
- Use shared CORS middleware from `_shared`.

## Effective Dating (Optional Extension)
If we need historical pricing by date, add `effective_from TIMESTAMPTZ` to price_template_updates and pick the row with the greatest effective_from <= reservation.start_time. Keep created_at for audit. We can add this later as a backward-compatible migration.

## Type Generation (Strict)
After applying the migration, regenerate TypeScript types:

```bash
supabase gen types typescript --project-id <pid> --schema public > app/src/lib/types/supabase.ts
```

  Ensure imports across the app point to the generated file. Regenerate on every subsequent migration as per rules.

See seed data examples in plans/PRICING_SEED_DATA.md.

## Client Integration (No Realtime; Pull-to-Refresh)
- Admin UI (mobile-first, Tailwind + DaisyUI):
  - Manage templates (create/update/delete) and add new update rows.
  - Reuse form components; keep each file < 300 lines.
- Pricing job results: show reservation.price in reservation lists.
- Use existing PullToRefresh to refetch reservations after admin updates or scheduled pricing runs.

## Backfill & Rollout
- After deploying, run pricing-run once to populate prices for eligible reservations.
- Consider feature flag or setting to control activation.
- Monitor via logs or a small `pricing_runs` history table.

## Testing Strategy
- Unit: mapping from reservation types to price fields; latest-update selection; monthly cap logic.
- Integration: seed templates and updates; run pricing-run; assert reservation.price.
- E2E: Admin adds a new update row; scheduled run recomputes; client pull-to-refresh shows new prices.

## Checklist
- [ ] Add migration for price_templates and price_template_updates
- [ ] Add column price_template_name to user_profiles if not present
- [ ] Enable RLS and restrict mutations to Edge Functions
- [ ] Implement Edge Functions: price-templates-crud, price-template-updates-create, pricing-run (latest-update aware)
- [ ] Add indexes and seed data
- [ ] Regenerate Supabase types and update imports
- [ ] Build admin UI (mobile-first, Tailwind + DaisyUI)
- [ ] Wire pull-to-refresh for client lists
- [ ] Add tests and monitoring
