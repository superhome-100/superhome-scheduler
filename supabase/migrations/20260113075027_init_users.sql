create type "public"."user_status" as enum ('active', 'disabled');
create type "public"."user_privilege" as enum ('normal', 'admin');

---

create table "public"."Users" (
  "id" text not null,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  "status" public.user_status not null default 'disabled'::user_status,
  "privileges" public.user_privilege not null default 'normal'::user_privilege,
  "name" text not null,
  "nickname" text not null,
  "email" text null,
  "metadata" jsonb null,
  "authId" uuid null,
  "authProvider" text null,
  "pushSubscripton" jsonb null,

  constraint users_pkey primary key ("id"),
  constraint users_email_key unique ("email"),
  constraint users_nickname_key unique ("nickname"),
  constraint users_auth_id_key unique ("authId"),
  constraint users_auth_uid_fkey foreign KEY ("authId") references "auth"."users" ("id") on update cascade on delete set default
) TABLESPACE pg_default;

alter table "public"."Users" enable row level security;

---

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = ''
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."Users" 
    WHERE "authId" = (SELECT auth.uid())
      AND "privileges" = 'admin'::public.user_privilege
      AND "status" = 'active'::public.user_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

---

CREATE OR REPLACE FUNCTION public.is_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SET search_path = ''
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "public"."Users" 
    WHERE "authId" = (SELECT auth.uid())
      AND "status" = 'active'::public.user_status
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_active() TO authenticated;

---

create policy "Enable users to view their own data only"
on "public"."Users"
as PERMISSIVE
for SELECT
to authenticated
using (
  "authId" = (SELECT auth.uid())
);

-- create policy "Enable active users to view other users"
-- on "public"."Users"
-- as PERMISSIVE
-- for SELECT
-- to authenticated
-- using (
--   (SELECT public.is_active())
-- );

---

CREATE OR REPLACE FUNCTION public.sync_auth_user_to_users()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  SECURITY DEFINER
AS $function$
BEGIN
  -- Insert a new row for the new auth user, or update existing (idempotent)
  INSERT INTO "public"."Users" (
    "id",
    "email",
    "name",
    "nickname",
    "authId",
    "authProvider"
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.email),
    COALESCE(
      NEW.raw_user_meta_data->>'preferred_username',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      NEW.email),
    NEW.id,
    NEW.raw_app_meta_data->>'provider'
  )
  ON CONFLICT (email) DO UPDATE
    SET "authId" = NEW.id,
        "authProvider" = NEW.raw_app_meta_data->>'provider',
        "name" = COALESCE(
          "Users"."name",
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'name',
          NEW.email),
        "nickname" = COALESCE(
          "Users"."nickname",
          NEW.raw_user_meta_data->>'preferred_username',
          NEW.raw_user_meta_data->>'name',
          NEW.raw_user_meta_data->>'full_name',
          NEW.email),
        "updatedAt" = NOW()
    ;
  RETURN NEW;
END;
$function$
;

CREATE TRIGGER sync_auth_user_to_users_trigger 
AFTER INSERT ON "auth"."users" FOR EACH ROW 
EXECUTE FUNCTION public.sync_auth_user_to_users();

---

CREATE OR REPLACE FUNCTION public.sync_deletion_of_users_to_auth_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM "auth"."users"
  WHERE "id" = OLD."authId";
  RETURN OLD;
END;
$$
;

CREATE TRIGGER sync_deletion_of_users_to_auth_user_trigger 
AFTER DELETE ON "public"."Users" FOR EACH ROW 
EXECUTE FUNCTION public.sync_deletion_of_users_to_auth_user();

---

-- for: api/getUsers
create view "public"."UsersMinimal" 
with (security_invoker = true) -- Important for RLS
as
  select "id", 
    "nickname",
    "status"
  from "public"."Users"
;