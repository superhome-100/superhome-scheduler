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
  'pushNotificationEnabled',
  'reservationCutOffTime',
  'reservationIncrement',
  'reservationLeadTimeDays'
);

---

create table "public"."Settings" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "name" public.setting_name not null,
  "value" jsonb not null,
  "startDate" date null default null,
  "endDate" date null default null,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),

  CONSTRAINT "Settings:cannot have overlapping name,[date]"
    EXCLUDE USING gist (
      "name" WITH =,
      daterange("startDate", "endDate",
        '[]' -- inclusive lower and upper
      ) WITH &&
    )
    WHERE ("startDate" IS NOT NULL OR "endDate" IS NOT NULL)
) TABLESPACE pg_default;

--

CREATE UNIQUE INDEX "Settings:one global per name" 
  ON "public"."Settings" ("name") 
  WHERE ("startDate" IS NULL AND "endDate" IS NULL);

--

ALTER TABLE "public"."Settings"
ADD CONSTRAINT "Settings: type of value is not correct"
CHECK (
  CASE 
    WHEN "name" IN (
      'classroomLabel',
      'poolLabel'
    ) THEN jsonb_typeof("value") = 'string'

    WHEN "name" IN (
      'cancelationCutOffTime',
      'maxClassroomEndTime',
      'maxPoolEndTime',
      'minClassroomStartTime',
      'minPoolStartTime',
      'openwaterAmEndTime',
      'openwaterAmStartTime',
      'openwaterPmEndTime',
      'openwaterPmStartTime',
      'reservationCutOffTime',
      'reservationIncrement'
    ) THEN jsonb_typeof("value") = 'string' 
       AND ("value" #>> '{}') ~ '^\d?\d:\d\d$' -- '"HH:mm"'

    WHEN "name" IN (
      'maxChargeableOWPerMonth',
      'reservationLeadTimeDays'
    ) THEN jsonb_typeof("value") = 'number'
      
    WHEN "name" IN (
      'cbsAvailable',
      'classroomBookable',
      'openForBusiness',
      'openwaterAmBookable',
      'openwaterPmBookable',
      'poolBookable',
      'pushNotificationEnabled'
      ) THEN jsonb_typeof("value") = 'boolean'
      
    WHEN "name" IN (
      'boats'
      'classrooms',
      'poolLanes',
    ) THEN jsonb_typeof("value") = 'array'
      
    ELSE false -- fail if name is not explicitly covered, to fix add it above
  END
);

alter table "public"."Settings" enable row level security;

---

CREATE TRIGGER "trigger_set_updatedAt_to_now_on_Settings"
BEFORE UPDATE ON "public"."Settings"
FOR EACH ROW
EXECUTE FUNCTION set_updatedAt_to_now();

---

create policy "Enable auth users to view all Settings"
on "public"."Settings"
as PERMISSIVE
for SELECT
to authenticated
using (
  (TRUE)
);

create policy "Enable anon users to view all Settings"
on "public"."Settings"
as PERMISSIVE
for SELECT
to anon
using (
  (TRUE)
);

---

CREATE TRIGGER "Broadcast changes of table: Settings"
AFTER INSERT OR UPDATE OR DELETE ON "public"."Settings"
FOR EACH ROW
EXECUTE FUNCTION "public"."broadcast_table_changes"();
