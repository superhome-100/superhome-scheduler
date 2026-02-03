---

create extension btree_gist with schema extensions;

---

CREATE OR REPLACE FUNCTION set_updatedAt_to_now()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  SECURITY DEFINER
AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$
;

---