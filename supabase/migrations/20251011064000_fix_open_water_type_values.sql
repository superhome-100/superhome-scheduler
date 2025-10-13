-- Fix open_water_type values from display names to correct variables
set search_path = public;

-- Debug: Show current state before update
DO $$
DECLARE
  v_count int;
  v_display_names text;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.res_openwater WHERE open_water_type IN ('Course/Coaching', 'Autonomous on Buoy (0-89m)', 'Autonomous on Platform (0-99m)', 'Autonomous on Platform +CBS (90-130m)');
  RAISE NOTICE 'res_openwater records with display name open_water_type: %', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.buoy_group WHERE open_water_type IN ('Course/Coaching', 'Autonomous on Buoy (0-89m)', 'Autonomous on Platform (0-99m)', 'Autonomous on Platform +CBS (90-130m)');
  RAISE NOTICE 'buoy_group records with display name open_water_type: %', v_count;
  
  -- Show distinct values
  SELECT string_agg(DISTINCT open_water_type, ', ') INTO v_display_names FROM public.res_openwater WHERE open_water_type IS NOT NULL;
  RAISE NOTICE 'Current res_openwater open_water_type values: %', v_display_names;
END $$;

-- Update res_openwater table
UPDATE public.res_openwater 
SET open_water_type = CASE 
  WHEN open_water_type = 'Course/Coaching' THEN 'course_coaching'
  WHEN open_water_type = 'Autonomous on Buoy (0-89m)' THEN 'autonomous_buoy'
  WHEN open_water_type = 'Autonomous on Platform (0-99m)' THEN 'autonomous_platform'
  WHEN open_water_type = 'Autonomous on Platform +CBS (90-130m)' THEN 'autonomous_platform_cbs'
  ELSE open_water_type
END
WHERE open_water_type IN ('Course/Coaching', 'Autonomous on Buoy (0-89m)', 'Autonomous on Platform (0-99m)', 'Autonomous on Platform +CBS (90-130m)');

-- Update buoy_group table
UPDATE public.buoy_group 
SET open_water_type = CASE 
  WHEN open_water_type = 'Course/Coaching' THEN 'course_coaching'
  WHEN open_water_type = 'Autonomous on Buoy (0-89m)' THEN 'autonomous_buoy'
  WHEN open_water_type = 'Autonomous on Platform (0-99m)' THEN 'autonomous_platform'
  WHEN open_water_type = 'Autonomous on Platform +CBS (90-130m)' THEN 'autonomous_platform_cbs'
  ELSE open_water_type
END
WHERE open_water_type IN ('Course/Coaching', 'Autonomous on Buoy (0-89m)', 'Autonomous on Platform (0-99m)', 'Autonomous on Platform +CBS (90-130m)');

-- Update the trigger function to use correct default value
CREATE OR REPLACE FUNCTION public.trg_ensure_open_water_type()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- If open_water_type is null, try to get it from the first member
  IF new.open_water_type IS NULL THEN
    SELECT DISTINCT o.open_water_type INTO new.open_water_type
    FROM public.res_openwater o
    WHERE o.group_id = new.id
      AND o.open_water_type IS NOT NULL
    LIMIT 1;
    
    -- If still null, set a default
    IF new.open_water_type IS NULL THEN
      new.open_water_type := 'course_coaching';
    END IF;
  END IF;
  
  RETURN new;
END;
$$;

-- Debug: Show state after update
DO $$
DECLARE
  v_count int;
  v_correct_values text;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.res_openwater WHERE open_water_type IN ('course_coaching', 'autonomous_buoy', 'autonomous_platform', 'autonomous_platform_cbs');
  RAISE NOTICE 'res_openwater records with correct open_water_type after update: %', v_count;
  
  SELECT COUNT(*) INTO v_count FROM public.buoy_group WHERE open_water_type IN ('course_coaching', 'autonomous_buoy', 'autonomous_platform', 'autonomous_platform_cbs');
  RAISE NOTICE 'buoy_group records with correct open_water_type after update: %', v_count;
  
  -- Show distinct values
  SELECT string_agg(DISTINCT open_water_type, ', ') INTO v_correct_values FROM public.res_openwater WHERE open_water_type IS NOT NULL;
  RAISE NOTICE 'Updated res_openwater open_water_type values: %', v_correct_values;
END $$;

-- Add a comment explaining the fix
COMMENT ON COLUMN public.res_openwater.open_water_type IS 'Open water type using standardized values: course_coaching, autonomous_buoy, autonomous_platform, autonomous_platform_cbs';
COMMENT ON COLUMN public.buoy_group.open_water_type IS 'Open water type using standardized values: course_coaching, autonomous_buoy, autonomous_platform, autonomous_platform_cbs';
