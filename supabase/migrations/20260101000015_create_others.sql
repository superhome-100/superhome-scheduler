---
---

create table "public"."Buoys" (
    "id" uuid not null default gen_random_uuid(),
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "name" text not null,
    "maxDepth" bigint null,
    "pulley" bool null,
    "extraBottomWeight" bool null,
    "bottomPlate" bool null,
    "largeBuoy" bool null,

    constraint Buoys_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Buoys" enable row level security;

---

create policy "Enable active users to view all Buoys"
on "public"."Buoys"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_active())
);

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Buoys"
BEFORE UPDATE ON "public"."Buoys"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: Buoys"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Buoys"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---
---

create table "public"."Boats" (
    "id" date not null,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "assignments" jsonb not null,

    constraint Boats_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Boats" enable row level security;

---

create policy "Enable active users to view all Boats"
on "public"."Boats"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_active())
);

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Boats"
BEFORE UPDATE ON "public"."Boats"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: Boats"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Boats"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---
---

create table "public"."BuoyGroupings" (
    "id" text not null default gen_random_uuid(),
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "comment" text null,
    "date" date not null default now(),
    "buoy" text not null default '',
    "am_pm" text not null default 'AM',

    constraint BuoyGroupings_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."BuoyGroupings" enable row level security;

---

create policy "Enable active users to view all BuoyGroupings"
on "public"."BuoyGroupings"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_active())
);

---

-- create policy "Enable active admins to modify all BuoyGrouping"
-- on "public"."BuoyGroupings"
-- as PERMISSIVE
-- for ALL
-- to authenticated
-- using (
--   (SELECT public.is_admin())
-- ) with check (
--   (SELECT public.is_admin())
-- );

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_BuoyGroupings"
BEFORE UPDATE ON "public"."BuoyGroupings"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: BuoyGroupings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."BuoyGroupings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();
