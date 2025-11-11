-- Persist computed price into reservations.price via server-side triggers
-- Follows project rules: strict RLS, CUD via Edge Functions/service role, strict typing

BEGIN;

-- Pure helper: compute total for a specific user and reservation date (no auth dependency)
CREATE OR REPLACE FUNCTION public.compute_reservation_total_for(
  p_uid uuid,
  p_res_ts timestamptz
)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  select coalesce(sum(price), 0)::integer
  from public.compute_prices_for_reservation_at(p_uid, p_res_ts) t;
$$;

COMMENT ON FUNCTION public.compute_reservation_total_for(uuid, timestamptz)
  IS 'Auth-agnostic variant to compute a reservation''s total for an exact reservation (uid + res_date timestamp).';

-- Apply helper: set reservations.price based on current child rows and template
CREATE OR REPLACE FUNCTION public._apply_reservation_price(
  p_uid uuid,
  p_res_ts timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total integer;
BEGIN
  v_total := public.compute_reservation_total_for(p_uid, p_res_ts);

  UPDATE public.reservations r
  SET price = v_total, updated_at = now()
  WHERE r.uid = p_uid
    AND r.res_date = p_res_ts
    AND (r.price IS DISTINCT FROM v_total);
END;
$$;

REVOKE ALL ON FUNCTION public._apply_reservation_price(uuid, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public._apply_reservation_price(uuid, timestamptz) TO service_role;

-- Trigger function to refresh price when child rows change
CREATE OR REPLACE FUNCTION public._trg_refresh_price_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid;
  v_res_ts timestamptz;
BEGIN
  v_uid := COALESCE(NEW.uid, OLD.uid);
  v_res_ts := COALESCE(NEW.res_date, OLD.res_date);

  PERFORM public._apply_reservation_price(v_uid, v_res_ts);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function to set price on reservations insert (after creating parent)
CREATE OR REPLACE FUNCTION public._trg_set_price_on_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public._apply_reservation_price(NEW.uid, NEW.res_date);
  RETURN NEW;
END;
$$;

-- Create/replace triggers idempotently
DO $$
BEGIN
  -- Parent: after insert only
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_price_on_reservation') THEN
    EXECUTE 'DROP TRIGGER trg_set_price_on_reservation ON public.reservations';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_set_price_on_reservation AFTER INSERT ON public.reservations FOR EACH ROW EXECUTE FUNCTION public._trg_set_price_on_reservation()';

  -- Children: res_pool
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_price_res_pool') THEN
    EXECUTE 'DROP TRIGGER trg_refresh_price_res_pool ON public.res_pool';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_refresh_price_res_pool AFTER INSERT OR UPDATE OR DELETE ON public.res_pool FOR EACH ROW EXECUTE FUNCTION public._trg_refresh_price_child()';

  -- Children: res_classroom
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_price_res_classroom') THEN
    EXECUTE 'DROP TRIGGER trg_refresh_price_res_classroom ON public.res_classroom';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_refresh_price_res_classroom AFTER INSERT OR UPDATE OR DELETE ON public.res_classroom FOR EACH ROW EXECUTE FUNCTION public._trg_refresh_price_child()';

  -- Children: res_openwater
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_refresh_price_res_openwater') THEN
    EXECUTE 'DROP TRIGGER trg_refresh_price_res_openwater ON public.res_openwater';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_refresh_price_res_openwater AFTER INSERT OR UPDATE OR DELETE ON public.res_openwater FOR EACH ROW EXECUTE FUNCTION public._trg_refresh_price_child()';
END $$;

-- Backfill existing reservations
-- Only backfill for rows where price is null to avoid overriding manual adjustments
UPDATE public.reservations r
SET price = public.compute_reservation_total_for(r.uid, r.res_date),
    updated_at = now()
WHERE r.price IS NULL;

COMMIT;

-- After applying this migration, regenerate TS types per project rules:
-- supabase gen types typescript --schema public > app/src/lib/types/supabase.ts
