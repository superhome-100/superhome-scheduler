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
