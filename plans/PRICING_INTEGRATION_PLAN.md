# Pricing Integration Plan (from old_app to current app)

## Overview
This plan migrates the legacy pricing logic from the old Xata-based app to our current Supabase setup, preserving business rules and the user’s strict guidelines:

- No realtime; use pull-to-refresh to reflect updated prices.
- Strict RLS for all tables.
- All CREATE/UPDATE/DELETE via Edge Functions with CORS using `_shared`.
- Regenerate types on every migration (type strictness).
- Mobile-first UI; keep code size per file under 300 lines and prefer reusable models/stores.

## Legacy Reference (old_app)
- Pricing job: `old_app/src/routes/api/updatePrices/+server.js`
  - Batches through confirmed reservations in current month, picks those with `price == null` and already started, computes and saves `Reservations.price`.
  - Applies monthly cap on chargeable Open Water autonomous bookings.
- Template mapping: `unpackTemplate()` maps `PriceTemplates` to category/type:
  - pool: `course -> coachPool`, `autonomous -> autoPool`
  - classroom: `course -> coachClassroom`
  - openwater: `course -> coachOW`, `autonomous -> autoOW`, `cbs -> cbsOW`, `proSafety -> proSafetyOW`,
    `autonomousPlatform -> platformOW`, `autonomousPlatformCBS -> platformCBSOW`, `competitionSetupCBS -> comp-setupOW`
- Schema (Xata): `old_app/src/lib/server/xata.codegen.ts`
  - `PriceTemplates`: all price fields above
  - `UserPriceTemplates`: `user -> priceTemplate` (plus optional `startDate`, `endDate`)
  - `Reservations.price` is an integer field

## Target Design (Supabase)
We will introduce two tables mirroring Xata’s structure, with strict RLS and typed enums reused from the app:

1) `price_templates`
- id (uuid, pk)
- coach_ow (int4 not null)
- coach_pool (int4 not null)
- coach_classroom (int4 not null)
- auto_ow (int4 not null)
- auto_pool (int4 not null)
- cbs_ow (int4 not null)
- pro_safety_ow (int4 not null default 0)
- platform_ow (int4 not null default 0)
- platform_cbs_ow (int4 not null default 0)
- comp_setup_ow (int4 not null default 0)
- created_at/updated_at (timestamptz default now())

2) `user_price_templates`
- id (uuid, pk)
- user_id (uuid references `auth.users` or our `users` table per current model)
- price_template_id (uuid references `price_templates`)
- start_date (date null)
- end_date (date null)
- created_at/updated_at (timestamptz default now())

3) `reservations` (existing)
- Ensure an `int4` `price` column exists. If not, add it.

Notes:
- Check existing enum before creating a new one (checkenum). We’ll reuse existing app enums for reservation category/type (client-only), and keep `price_templates` numeric columns without enum dependencies.

## RLS Policies
- `price_templates`: 
  - SELECT: authenticated users can read.
  - INSERT/UPDATE/DELETE: admins only (via role claim) and only through Edge Functions.
- `user_price_templates`:
  - SELECT: a user can read rows for their own `user_id`; admins can read all.
  - INSERT/UPDATE/DELETE: admins only (and Edge Functions).
- `reservations`:
  - Price updates are performed by Edge Function service role. Regular users cannot update `price` directly.

## Edge Functions (Server-only Mutations)
Create these Supabase Edge Functions with CORS via `_shared` (follow pattern used in `supabase/functions/reservations-create/index.ts`):

1) `pricing-run`
- Purpose: Batch compute prices for eligible reservations (current month, confirmed, price is null, reservation time <= now).
- Inputs: none (server-scheduled), or `{ date?: string }` for manual run.
- Steps:
  - Load settings to compute daily AM/PM OW start times and monthly cap.
  - Fetch `reservations` in the date range; partition to old vs new as legacy.
  - For users present in `new` set, load their active `user_price_templates` and join to `price_templates`.
  - Map templates using the same keys as legacy.
  - Apply monthly cap for OW autonomous.
  - Multiply course prices by `num_students`.
  - Batch update `reservations.price`.

2) `price-templates-crud`
- Admin-only CRUD for `price_templates`.

3) `user-price-templates-crud`
- Admin-only CRUD for `user_price_templates`.

CORS: Use `_shared` CORS helper and match the example at `supabase/functions/reservations-create/index.ts`.

## Scheduling
- Use Supabase Scheduled Functions (cron) to run `pricing-run` every 10–15 minutes, or hourly, aligned with business needs. Manual trigger allowed for admins.

## Settings Dependencies
- We rely on equivalent settings present in current app (AM/PM OW start, monthly cap). If not present yet, add to settings table and type layer, and regenerate types.

## Migrations & Type Generation
- Add SQL migrations in `supabase/migrations/`:
  - Create `price_templates` and `user_price_templates`.
  - Add `price int4` to `reservations` if missing.
  - RLS policies for both tables; grant `service_role` full access.
- After applying migrations, regenerate types:
  - supabase gen types typescript --project-id <pid> --schema public > app/src/lib/types/supabase.ts
  - Ensure the project’s type import paths are updated.

## Client Integration (No Realtime; Pull-to-Refresh)
- Display `reservation.price` wherever reservations are listed (e.g., `app/src/lib/components/...`).
- On pull-to-refresh (existing component per auth/plans memories), refetch reservations from the server so newly computed prices appear.
- Add an admin-only screen to manage price templates and user mappings (using Tailwind + DaisyUI, mobile-first, files < 300 lines, reusable form components).
- All mutations from that screen call the CRUD edge functions.

## Data Flow Summary
1) Admin creates/updates `price_templates` and maps users via `user_price_templates` (Edge Functions).
2) `pricing-run` scheduled function computes prices and updates `reservations.price`.
3) Client pull-to-refresh reloads reservations and shows updated prices.

## Column Semantics (Parity with legacy)
- coach_ow: Open water course base price (multiplied by `num_students`).
- coach_pool: Pool course base price (multiplied by `num_students`).
- coach_classroom: Classroom course base price (multiplied by `num_students`).
- auto_ow: Open water autonomous price (subject to monthly cap; price becomes 0 once exceeded).
- auto_pool: Pool autonomous price (flat).
- cbs_ow: Open water CBS price.
- pro_safety_ow: Open water pro safety price.
- platform_ow: Open water autonomous platform price.
- platform_cbs_ow: Open water autonomous platform CBS price.
- comp_setup_ow: Open water competition setup CBS price.

## Backfill & Rollout
- Backfill: After deploying, run `pricing-run` once to price all historical unpriced reservations within the current month window. If needed, provide an admin manual trigger for arbitrary date ranges.
- Feature flags: Toggle pricing job via a setting to allow safe activation.
- Monitoring: Log metrics in Edge Function (count updated, errors), and optionally store run history in a lightweight table `pricing_runs`.

## Testing Strategy
- Unit tests for mapping logic and monthly cap calculations.
- Integration tests: invoke `pricing-run` against a seeded DB; assert updated `reservations.price`.
- E2E: Admin updates a template; schedule run; client pull-to-refresh shows updated prices.

## Risks & Mitigations
- Multiple active user templates: Filter by `start_date/end_date` and pick the one active on reservation date. If multiple, pick the most recent `start_date`.
- Timezone misalignment: Use Day.js with timezone consistently and the same business-day logic used across the app.
- RLS lockouts: Ensure `service_role` and edge functions have appropriate grants; forbid direct client mutations.

## Step-by-Step Checklist
- [ ] Create migrations for `price_templates`, `user_price_templates`, `reservations.price` if missing
- [ ] Add strict RLS (select-only for users, admin-only mutations)
- [ ] Regenerate types and update imports
- [ ] Implement `pricing-run` edge function with CORS
- [ ] Add scheduled trigger (cron) and admin manual trigger
- [ ] Implement CRUD edge functions for admin screens with CORS
- [ ] Build admin UI for templates and user mappings (DaisyUI, mobile-first)
- [ ] Wire client pull-to-refresh to re-fetch reservations and display `price`
- [ ] Add tests (unit/integration/E2E)
- [ ] Monitor and iterate
