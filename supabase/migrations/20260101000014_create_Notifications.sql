---
---

create type "public"."notification_status" as enum (
    'active',
    'inactive'
);

create table "public"."Notifications" (
    "id" uuid not null default gen_random_uuid(),
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "status" public.notification_status not null default 'active'::notification_status,
    "message" text not null,
    "checkboxMessage" text not null,

    constraint Notifications_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Notifications" enable row level security;

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Notifications"
BEFORE UPDATE ON "public"."Notifications"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

CREATE TRIGGER "Broadcast changes of table: Notifications"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Notifications"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---
---

create table "public"."NotificationReceipts" (
    "notification" uuid not null /* link: Notifications */,
    "user" uuid not null /* link: Users */,
    "createdAt" timestamp with time zone not null default now(),

    constraint NotificationReceipts_pkey primary key ("notification", "user"),
    constraint NotificationReceipts_user_key foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete cascade,
    constraint NotificationReceipts_notification_key foreign KEY ("notification") references "public"."Notifications" ("id") on update cascade on delete cascade
) TABLESPACE pg_default;

alter table "public"."NotificationReceipts" enable row level security;

---

-- CREATE TRIGGER "Broadcast changes of table: NotificationReceipts"
-- AFTER INSERT OR UPDATE OR DELETE ON "public"."NotificationReceipts"
-- FOR EACH ROW
-- EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

CREATE OR REPLACE FUNCTION public.get_user_unread_notifications()
RETURNS SETOF "Notifications" 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT n.*
  FROM public."Notifications" n
  WHERE n.status = 'active' -- only active notifications
    AND EXISTS (
      SELECT 1 FROM "public"."Users" 
      WHERE "authId" = (SELECT auth.uid()) 
        AND "status" = 'active') -- only to active users
    AND NOT EXISTS (
    SELECT 1 
    FROM public."NotificationReceipts" nr 
    WHERE nr.notification = n.id 
    AND nr."user" = (SELECT id FROM "public"."Users" WHERE "authId" = (SELECT auth.uid()))
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_unread_notifications() TO authenticated;
