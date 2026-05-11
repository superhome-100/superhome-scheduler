ALTER TABLE "public"."PriceTemplates"
ADD COLUMN "autoOW-PM" bigint null default null;

ALTER TABLE "public"."PriceTemplates"
ADD COLUMN "coachOW-PM" bigint null default null;
