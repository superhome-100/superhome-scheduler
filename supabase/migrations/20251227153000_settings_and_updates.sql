-- Migration: Create settings and settings_updates tables
-- Description: Adds tables for application settings and their values/history.

BEGIN;

-- 1. settings table
CREATE TABLE IF NOT EXISTS public.settings (
    name text PRIMARY KEY,
    description text,
    created_at timestamptz DEFAULT now()
);

-- 2. settings_updates table
CREATE TABLE IF NOT EXISTS public.settings_updates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    settings_name text NOT NULL REFERENCES public.settings(name) ON DELETE CASCADE,
    "reservationCutOffTimeOW" time NOT NULL,
    "cancelationCutOffTimeOW" integer NOT NULL,
    "reservationCutOffTimePOOL" integer NOT NULL,
    "cancelationCutOffTimePOOL" integer NOT NULL,
    "reservationCutOffTimeCLASSROOM" integer NOT NULL,
    "cancelationCutOffTimeCLASSROOM" integer NOT NULL,
    "reservationLeadTimeDays" integer NOT NULL,
    "maxChargeableOWPerMonth" integer NOT NULL,
    "availablePoolSlots" text NOT NULL,
    "availableClassrooms" text NOT NULL,
    "poolLable" text NOT NULL,
    "classroomLable" text NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings_updates ENABLE ROW LEVEL SECURITY;

-- Policies for settings
CREATE POLICY settings_select_policy ON public.settings
    FOR SELECT TO authenticated USING (true);

CREATE POLICY settings_all_admin ON public.settings
    FOR ALL TO authenticated USING (public.is_admin());

-- Policies for settings_updates
CREATE POLICY settings_updates_select_policy ON public.settings_updates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY settings_updates_all_admin ON public.settings_updates
    FOR ALL TO authenticated USING (public.is_admin());

-- 4. Seed data
INSERT INTO public.settings (name, description)
VALUES ('default', 'default app settings')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.settings_updates (
    settings_name,
    "reservationCutOffTimeOW",
    "cancelationCutOffTimeOW",
    "reservationCutOffTimePOOL",
    "cancelationCutOffTimePOOL",
    "reservationCutOffTimeCLASSROOM",
    "cancelationCutOffTimeCLASSROOM",
    "reservationLeadTimeDays",
    "maxChargeableOWPerMonth",
    "availablePoolSlots",
    "availableClassrooms",
    "poolLable",
    "classroomLable"
) VALUES (
    'default',
    '18:00',
    60,
    30,
    60,
    30,
    60,
    30,
    12,
    '1,2,3,4,5,6,7,8',
    '3,2',
    'slot',
    'classroom'
);

COMMIT;
