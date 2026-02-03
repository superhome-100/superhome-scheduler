---

create type "public"."reservation_status" as enum (
    'canceled',
    'confirmed',
    'pending',
    'rejected'
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

---

create table "public"."Reservations" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "owTime" text null,
    "resType" public.reservation_type not null,
    "numStudents" bigint null,
    "maxDepth" bigint null,
    "comments" text null,
    "user" text not null /* link: Users */,
    "startTime" time not null,
    "endTime" time not null,
    "category" text not null,
    "date" date not null,
    "owner" bool not null default true,
    "buddies" text[] not null default '{}'::text[],
    "status" public.reservation_status not null default 'pending'::reservation_status,
    "pulley" bool null,
    "extraBottomWeight" bool null,
    "bottomPlate" bool null,
    "largeBuoy" bool null,
    "lanes" text[] null default null,
    "O2OnBuoy" bool null,
    "buoy" text null default 'auto',
    "room" text null default 'auto',
    "price" bigint null,
    "shortSession" bool not null default false,
    "allowAutoAdjust" bool not null default true,

    CONSTRAINT Reservations_pkey primary KEY ("id"),
    CONSTRAINT Reservations_user_key foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete set null,
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

-- for: api/reports/reservations
create view "public"."ReservationsReport" 
with (security_invoker = true) -- Important for RLS
as
  select "date", 
    "category",
    "owTime", 
    SUM(1 + COALESCE("numStudents", 0)) as "count"
  from "public"."Reservations"
  where "status" in ('confirmed', 'pending')
  group by 1,2,3
;

---

create table "public"."Settings" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "name" text null,
    "value" text null,
    "startDate" text not null default 'default',
    "endDate" text not null default 'default',

    constraint Settings_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Settings" enable row level security;


---

create table "public"."Buoys" (
    "id" text not null default gen_random_uuid()::text,
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

create table "public"."Boats" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "assignments" text null,

    constraint Boats_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Boats" enable row level security;


---

create table "public"."PriceTemplates" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "coachOW" bigint null,
    "coachPool" bigint null,
    "coachClassroom" bigint null,
    "autoOW" bigint null,
    "autoPool" bigint null,
    "cbsOW" bigint null default 0,
    "proSafetyOW" bigint null default 0,
    "platformOW" bigint null default 0,
    "platformCBSOW" bigint null default 0,
    "comp-setupOW" bigint null default 0,

    constraint PriceTemplates_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."PriceTemplates" enable row level security;


---

create table "public"."UserPriceTemplates" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "user" text null /* link: Users */,
    "priceTemplate" text not null /* link: PriceTemplates */,
    "startDate" text null default 'default',
    "endDate" text null default 'default',

    constraint UserPriceTemplates_pkey primary key ("id"),
    constraint UserPriceTemplates_user_key foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete set null,
    constraint UserPriceTemplates_priceTemplate_key foreign KEY ("priceTemplate") references "public"."PriceTemplates" ("id") on update cascade on delete cascade
) TABLESPACE pg_default;

alter table "public"."UserPriceTemplates" enable row level security;


---

create table "public"."BuoyGroupings" (
    "id" text not null,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "comment" text null,
    "date" timestamp with time zone not null default NOW(),
    "buoy" text not null default '',
    "am_pm" text not null default 'AM',

    constraint BuoyGroupings_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."BuoyGroupings" enable row level security;


---

create table "public"."Notifications" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "message" text null,
    "checkboxMessage" text null,

    constraint Notifications_pkey primary key ("id")
) TABLESPACE pg_default;

alter table "public"."Notifications" enable row level security;


---

create table "public"."NotificationReceipts" (
    "id" text not null default gen_random_uuid()::text,
    "createdAt" timestamp with time zone not null default now(),
    "updatedAt" timestamp with time zone not null default now(),
    "user" text null /* link: Users */,
    "notification" text null /* link: Notifications */,

    constraint NotificationReceipts_pkey primary key ("id"),
    constraint NotificationReceipts_user_key foreign KEY ("user") references "public"."Users" ("id") on update cascade on delete cascade,
    constraint NotificationReceipts_notification_key foreign KEY ("notification") references "public"."Notifications" ("id") on update cascade on delete cascade
) TABLESPACE pg_default;

alter table "public"."NotificationReceipts" enable row level security;


---