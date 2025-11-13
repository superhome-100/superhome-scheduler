# Pricing Seed Data

Use a seed SQL file or an admin-only function to insert initial templates and prices.

```sql
INSERT INTO public.price_templates (name, id, description) VALUES
  ('regular', 'REG-001', 'Default pricing'),
  ('vip1', 'VIP-001', 'VIP tier 1');

INSERT INTO public.price_template_updates (
  id, price_template_name, coach_ow, coach_pool, coach_classroom,
  auto_ow, auto_pool, cbs_ow, prosafety_ow, platform_ow, platformcbs_ow, compsetup_ow
) VALUES
  ('u_001', 'regular', 1000, 400, 300, 900, 300, 2000, 2000, 1300, 1500, 2000),
  ('u_002', 'vip1',    900,  350, 250, 800,  250, 1800, 1800, 1200, 1400, 1800);
```
