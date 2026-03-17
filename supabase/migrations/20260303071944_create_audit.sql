CREATE SCHEMA audit;

CREATE TABLE audit.logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    new_data JSONB,
    changed_by_user UUID, -- references public.Users(id)
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX "idx_audit_logs_table_record" ON audit.logs (table_name, record_id);

---
---

CREATE OR REPLACE FUNCTION audit.if_modified_func()
  RETURNS TRIGGER 
  LANGUAGE plpgsql
  SET search_path = ''
  SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID := public.user_id();
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit.logs (table_name, record_id, operation, new_data, changed_by_user)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(NEW), current_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit.logs (table_name, record_id, operation, new_data, changed_by_user)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, NULL, current_user_id);
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit.logs (table_name, record_id, operation, new_data, changed_by_user)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW), current_user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

---
---

CREATE OR REPLACE TRIGGER audit_Reservations
AFTER INSERT OR UPDATE OR DELETE ON "public"."Reservations"
FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

---

CREATE OR REPLACE TRIGGER audit_Users
AFTER INSERT OR UPDATE OR DELETE ON "public"."Users"
FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

---

CREATE OR REPLACE TRIGGER "audit_PriceTemplates"
AFTER INSERT OR UPDATE OR DELETE ON "public"."PriceTemplates"
FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();

---

CREATE OR REPLACE TRIGGER "audit_UserPriceTemplates"
AFTER INSERT OR UPDATE OR DELETE ON "public"."UserPriceTemplates"
FOR EACH ROW EXECUTE FUNCTION audit.if_modified_func();