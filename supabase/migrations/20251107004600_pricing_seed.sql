-- Seed initial pricing templates and updates
-- Sourced from plans/PRICING_SEED_DATA.md

BEGIN;

-- Insert templates (name is PK)
INSERT INTO public.price_templates (name, description) VALUES
  ('regular', 'Default pricing'),
  ('vip1', 'VIP tier 1')
ON CONFLICT (name) DO NOTHING;

-- Insert latest updates (append-only); if id collides, skip
INSERT INTO public.price_template_updates (
  id, price_template_name, coach_ow, coach_pool, coach_classroom,
  auto_ow, auto_pool, platform_ow, platformcbs_ow, created_at
) VALUES
  -- Example 1: Initial template values on 2025-10-15 increment by 50
  ('regular_20251015', 'regular', 1000, 400, 300, 900, 300, 1300, 1500, '2025-10-15 00:00:00+00'),
  -- Example 2: Update on 2025-10-30 increment by 50
  ('regular_20251030', 'regular', 1050, 450, 350, 950, 350, 1350, 1550, '2025-10-30 00:00:00+00'),
  -- Example 3: Update on 2025-11-07 increment by 50
  ('regular_20251107', 'regular', 1100, 500, 400, 1000, 400, 1400, 1600, '2025-11-07 00:00:00+00'),
  -- Keep a VIP example row
  ('vip1_20251101', 'vip1',    900,  350, 250, 800,  250, 1200, 1400, '2025-11-01 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

COMMIT;
