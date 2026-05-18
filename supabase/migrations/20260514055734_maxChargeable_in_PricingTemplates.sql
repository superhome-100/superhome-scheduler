BEGIN;

ALTER TABLE "public"."PriceTemplates"
ADD COLUMN "autoOW-maxChargeablePerMonth" BIGINT NOT NULL DEFAULT 12;

ALTER TABLE "public"."PriceTemplates"
ALTER COLUMN "autoOW-maxChargeablePerMonth"
DROP DEFAULT;

ALTER TABLE "public"."PriceTemplates"
ADD COLUMN "autoOW-overMaxChargeableOWPerMonth" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "public"."PriceTemplates"
ALTER COLUMN "autoOW-overMaxChargeableOWPerMonth"
DROP DEFAULT;

DELETE FROM "public"."Settings"
WHERE
    "name" = 'maxChargeableOWPerMonth';

ALTER TYPE "public"."setting_name"
RENAME VALUE 'maxChargeableOWPerMonth' TO '_deleted_maxChargeableOWPerMonth';

COMMIT;