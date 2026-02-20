---
---

create type "public"."reservation_status" as enum (
    'canceled',
    'confirmed',
    'pending',
    'rejected'
);

create type "public"."reservation_category" as enum (
    'classroom',
    'openwater',
    'pool'
);

create type "public"."reservation_type" as enum (
    'autonomous',
    'autonomousPlatform',
    'autonomousPlatformCBS',
    'cbs',
    'competitionSetupCBS',
    'course',
    'proSafety'
);

create type "public"."reservation_ow_time" as enum (
    'AM',
    'PM'
);

---

create table "public"."Reservations" (
    "id" uuid not null default gen_random_uuid(),
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "user" uuid not null /* link: Users */,
    "status" public.reservation_status not null default 'pending'::reservation_status,
    "date" date not null,
    "startTime" time not null,
    "endTime" time not null,
    "category" public.reservation_category not null,
    "resType" public.reservation_type not null,
    "owTime" public.reservation_ow_time null,
    "comments" text null,
    "buddies" uuid[] not null default '{}'::uuid[], /* link: Users[] */
    "numStudents" bigint null,
    "maxDepth" bigint null,
    "owner" bool not null default true,
    "pulley" bool null,
    "extraBottomWeight" bool null,
    "bottomPlate" bool null,
    "largeBuoy" bool null,
    "lanes" text[] null default null,
    "O2OnBuoy" bool null,
    "buoy" text null default 'auto',
    "room" text null default 'auto',
    "shortSession" bool not null default false,
    "allowAutoAdjust" bool not null default true,
    "price" bigint null,

    CONSTRAINT Reservations_pkey primary KEY ("id"),
    CONSTRAINT Reservations_user_key foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete restrict,
    CONSTRAINT "Reservations:cannot have overlapping same user,date,[time)"
        EXCLUDE USING gist (
            "user" WITH =,
            "date" WITH =,
            tsrange(("date" + "startTime"), ("date" + "endTime")) WITH &&
        )
        WHERE ("status" NOT IN ('rejected', 'canceled'))
) TABLESPACE pg_default;

CREATE INDEX ON "public"."Reservations" USING btree ("date");

alter table "public"."Reservations" enable row level security;

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Reservations"
BEFORE UPDATE ON "public"."Reservations"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

create policy "Enable active users to view all Reservations"
on "public"."Reservations"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_active())
);

---

create policy "Enable admins to update all Reservations"
on "public"."Reservations"
as PERMISSIVE
for UPDATE
to authenticated
using (
  (SELECT public.is_admin())
);

---

CREATE TRIGGER "Broadcast changes of table: Reservations"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Reservations"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

---

create or replace view "public"."ReservationsEx" 
with (security_invoker = true) -- Important for RLS
as
  SELECT 
      r.*,
      jsonb_build_object(
        'id', r.user,
        'nickname', COALESCE(u.nickname, '<unknown>'),
        'name', COALESCE(u.name, '<unknown>')
      ) AS user_json,
      COALESCE(bd.buddies_json, '[]'::jsonb) as buddies_json
  FROM "Reservations" r
  LEFT JOIN "Users" u
    ON r.user = u.id
  CROSS JOIN LATERAL (
      SELECT jsonb_agg(
          jsonb_build_object(
              'id', u.id,
              'nickname', u.nickname,
              'name', u.name
          )
      ) AS buddies_json
      FROM "Users" u
      WHERE u.id = ANY(r.buddies)
  ) AS bd
;

---

-- for: api/reports/reservations
create view "public"."ReservationsReport" 
with (security_invoker = true) -- Important for RLS
as
  with r as (
    select 
      "date", 
      "category",
      "owTime",
      SUM(1 + COALESCE("numStudents", 0)) as "count"
    from "public"."Reservations"
    where "status" in ('confirmed', 'pending')
    group by 1,2,3
  )
  select 
    r."date",
    jsonb_build_object(
      'pool', coalesce(sum(count) filter (where "category" = 'pool'), 0),
      'classroom', coalesce(sum(count) filter (where "category" = 'classroom'), 0),
      'openwater', jsonb_build_object(
        'AM', coalesce(sum(count) filter (where "category" = 'openwater' and "owTime" = 'AM'), 0),
        'PM', coalesce(sum(count) filter (where "category" = 'openwater' and "owTime" = 'PM'), 0),
        'ow_am_full', coalesce(ds.value, 'false'::jsonb)
      )
    ) as summary
  from r
  left join "public"."DaySettings" as ds
      on r."date" = ds."date" and ds."key" = 'ow_am_full'
  group by r."date", ds."value"
;

---
---

create type "public"."setting_name" as enum (
  'boats',
  'cancelationCutOffTime',
  'cbsAvailable',
  'classroomBookable',
  'classroomLabel',
  'classrooms',
  'maxChargeableOWPerMonth',
  'maxClassroomEndTime',
  'maxPoolEndTime',
  'minClassroomStartTime',
  'minPoolStartTime',
  'openForBusiness',
  'openwaterAmBookable',
  'openwaterAmEndTime',
  'openwaterAmStartTime',
  'openwaterPmBookable',
  'openwaterPmEndTime',
  'openwaterPmStartTime',
  'poolBookable',
  'poolLabel',
  'poolLanes',
  'reservationCutOffTime',
  'reservationIncrement',
  'reservationLeadTimeDays'
);

---

create table "public"."Settings" (
  "id" uuid not null default gen_random_uuid(),
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  "name" public.setting_name not null,
  "value" jsonb not null,
  "startDate" date null default null,
  "endDate" date null default null,

  constraint Settings_pkey primary key ("id"),
  CONSTRAINT "Settings:cannot have overlapping name,[date]"
    EXCLUDE USING gist (
      "name" WITH =,
      daterange("startDate", "endDate",
        '[]' -- inclusive lower and upper
      ) WITH &&
    )
    WHERE ("startDate" IS NOT NULL OR "endDate" IS NOT NULL)
) TABLESPACE pg_default;

CREATE UNIQUE INDEX "Settings:one_global_per_name" 
  ON "public"."Settings" ("name") 
  WHERE ("startDate" IS NULL AND "endDate" IS NULL);

alter table "public"."Settings" enable row level security;

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Settings"
BEFORE UPDATE ON "public"."Settings"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

create policy "Enable active users to view all Settings"
on "public"."Settings"
as PERMISSIVE
for SELECT
to authenticated
using (
  (SELECT public.is_active())
);

---

CREATE TRIGGER "Broadcast changes of table: Settings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Settings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();

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

---
---