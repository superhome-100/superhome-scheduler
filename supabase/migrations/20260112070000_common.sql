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

--- https://supabase.com/docs/guides/realtime/broadcast
--- https://supabase.com/docs/guides/realtime/subscribing-to-database-changes

CREATE POLICY "Authenticated can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING ( true );

---

CREATE OR REPLACE FUNCTION "public"."broadcast_table_changes"()
RETURNS trigger
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
    PERFORM realtime.broadcast_changes(
      'table_changes',             -- topic - the topic to which you're broadcasting where you can use the topic id to build the topic name
      TG_TABLE_NAME,               -- event - the event that triggered the function
      TG_OP,                       -- operation - the operation that triggered the function
      TG_TABLE_NAME,               -- table - the table that caused the trigger
      TG_TABLE_SCHEMA,             -- schema - the schema of the table that caused the trigger
      NULL,                        -- new record - the record after the change
      NULL                         -- old record - the record before the change
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;