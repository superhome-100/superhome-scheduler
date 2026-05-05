BEGIN;

ALTER TYPE "public"."setting_name" ADD VALUE 'proSafetyAvailableOnTheseDaysOfTheWeek' AFTER 'poolLanes';

COMMIT;

---

BEGIN;

ALTER TABLE "public"."Settings"
DROP CONSTRAINT "Settings: type of value is not correct";

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
      'reservationLeadTimeDays',
      'reservationLateCancelPenalty1OffsetMins'
    ) THEN jsonb_typeof("value") = 'number'
      
    WHEN "name" IN (
      'classroomBookable',
      'openForBusiness',
      'openwaterAmBookable',
      'openwaterPmBookable',
      'poolBookable',
      'pushNotificationEnabled'
      ) THEN jsonb_typeof("value") = 'boolean'
      
    WHEN "name" IN (
      'boats',
      'classrooms',
      'poolLanes'
    ) THEN jsonb_typeof("value") = 'array' 
       AND jsonb_path_exists("value", '$[*] ? (@.type() != "string")') = FALSE

    WHEN "name" IN (
      'cbsAvailableOnTheseDaysOfTheWeek',
      'proSafetyAvailableOnTheseDaysOfTheWeek'
    ) THEN jsonb_typeof("value") = 'array' 
       AND jsonb_path_exists("value", '$[*] ? (@.type() != "number")') = FALSE
      
    ELSE FALSE -- fail if name is not explicitly covered, to fix add it above
  END
);

COMMIT;
