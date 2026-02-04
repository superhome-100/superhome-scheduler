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

---

CREATE TRIGGER "Broadcast changes of table: BuoyGroupings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."BuoyGroupings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

CREATE TRIGGER "Broadcast changes of table: DaySettings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."DaySettings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

CREATE TRIGGER "Broadcast changes of table: Users"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Users"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

CREATE TRIGGER "Broadcast changes of table: Settings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Settings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

CREATE TRIGGER "Broadcast changes of table: Reservations"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Reservations"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();
