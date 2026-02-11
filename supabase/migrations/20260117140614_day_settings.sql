---
---

create table "public"."DaySettings" (
  "date" date not null,
  "key" text not null,
  "value" jsonb not null,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  
  constraint DaySettings_pkey primary key ("date", "key")
) TABLESPACE pg_default;

alter table "public"."DaySettings" enable row level security;

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_DaySettings"
BEFORE UPDATE ON "public"."DaySettings"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

-- better would be active users but doesn't really matter
create policy "Enable users to select DaySettings"
on "public"."DaySettings"
as PERMISSIVE
for SELECT
to authenticated
using (
  TRUE
);

---

CREATE TRIGGER "Broadcast changes of table: DaySettings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."DaySettings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---
---