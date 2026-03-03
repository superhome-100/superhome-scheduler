UPDATE "public"."Reservations"
SET
  "numStudents" = NULL
WHERE
  "resType" <> 'course' AND "numStudents" IS NOT NULL
;

ALTER TABLE "public"."Reservations"
ADD CONSTRAINT "Reservations: can have numStudents only if course"
CHECK (
    ("resType" = 'course' AND "numStudents" IS NOT NULL) 
    OR ("resType" <> 'course' AND "numStudents" IS NULL)
);
