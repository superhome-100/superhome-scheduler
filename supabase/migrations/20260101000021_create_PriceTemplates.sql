---
---

create table "public"."PriceTemplates" (
    "id" text not null,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "coachOW" bigint not null,
    "coachPool" bigint not null,
    "coachClassroom" bigint not null,
    "autoOW" bigint not null,
    "autoPool" bigint not null,
    "cbsOW" bigint not null,
    "proSafetyOW" bigint not null,
    "platformOW" bigint not null,
    "platformCBSOW" bigint not null,
    "comp-setupOW" bigint not null,

    constraint PriceTemplates_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."PriceTemplates" enable row level security;

---

create policy "Enable active users to view all PriceTemplates"
on "public"."PriceTemplates"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_admin())
);

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_PriceTemplates"
BEFORE UPDATE ON "public"."PriceTemplates"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: PriceTemplates"
AFTER INSERT OR UPDATE OR DELETE ON "public"."PriceTemplates"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---
---

create table "public"."UserPriceTemplates" (
    "user" uuid not null /* link: Users */,
    "priceTemplate" text not null /* link: PriceTemplates */,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),

    constraint UserPriceTemplates_user_pkey primary key ("user"),
    constraint UserPriceTemplates_user_fkey foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete cascade,
    constraint UserPriceTemplates_priceTemplate_key foreign KEY ("priceTemplate") references "public"."PriceTemplates" ("id") on update cascade on delete restrict
) TABLESPACE pg_default;

alter table "public"."UserPriceTemplates" enable row level security;

---

create policy "Enable admins to manage all UserPriceTemplates"
on "public"."UserPriceTemplates"
as PERMISSIVE
for ALL
to authenticated
using (
  (SELECT public.is_admin())
);

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_UserPriceTemplates"
BEFORE UPDATE ON "public"."UserPriceTemplates"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: UserPriceTemplates"
AFTER INSERT OR UPDATE OR DELETE ON "public"."UserPriceTemplates"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

create view "public"."ReservationsWithPrices" 
with (security_invoker = true) -- Important for RLS
as
  select r.*
        , to_jsonb(pt.*) as "priceTemplate"
  from public."Reservations" r
  left join public."UserPriceTemplates" up on r."user" = up."user"
  left join public."PriceTemplates" pt 
    -- coalesce(.., regular) is crutial, it makes the api/admin/updatePrices logic work for users without price plan
    on coalesce(up."priceTemplate", 'regular') = pt."id"
;
