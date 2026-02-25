CREATE OR REPLACE FUNCTION public.merge_users(
    target_id UUID, 
    source_id UUID
) RETURNS VOID 
SET search_path = ''
AS $$
BEGIN
    UPDATE public."Reservations"
    SET 
        "user" = CASE 
            WHEN "user" = source_id THEN target_id 
            ELSE "user" 
        END,
        "buddies" = array_replace("buddies", source_id, target_id)
    WHERE 
        "user" = source_id 
        OR source_id = ANY("buddies");

    DELETE FROM public."Users"
    WHERE "id" = source_id;

    -- Check for identity or no-op
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source ID % not found', source_id;
    END IF;
END;
$$ LANGUAGE plpgsql;