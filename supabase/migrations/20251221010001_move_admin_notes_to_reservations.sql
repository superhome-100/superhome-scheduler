-- Move admin_notes to reservations table
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Move data if any exists (probably none yet)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reservation_admin_notes') THEN
        UPDATE public.reservations r
        SET admin_notes = an.admin_note
        FROM public.reservation_admin_notes an
        WHERE r.reservation_id = an.reservation_id;
        
        DROP TABLE public.reservation_admin_notes;
    END IF;
END $$;
