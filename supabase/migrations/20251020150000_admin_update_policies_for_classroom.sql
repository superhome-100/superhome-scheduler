-- Migration: Allow admins to update detail rows so approval can auto-assign
set search_path = public;

-- res_classroom: add admin update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'res_classroom' AND policyname = 'res_classroom_admin_update_all'
  ) THEN
    CREATE POLICY res_classroom_admin_update_all
      ON public.res_classroom
      FOR UPDATE
      USING ( public.is_admin() )
      WITH CHECK ( public.is_admin() );
  END IF;
END$$;

-- res_pool: add admin update policy (kept consistent with classroom/pool behavior)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'res_pool' AND policyname = 'res_pool_admin_update_all'
  ) THEN
    CREATE POLICY res_pool_admin_update_all
      ON public.res_pool
      FOR UPDATE
      USING ( public.is_admin() )
      WITH CHECK ( public.is_admin() );
  END IF;
END$$;
