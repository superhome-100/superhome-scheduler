CREATE OR REPLACE VIEW public.user_profiles_auth
    WITH (security_invoker=OFF)
AS
select
  up.*,
  au.email as email,
  au.last_sign_in_at as last_sign_in_at,
  au.raw_user_meta_data ->> 'avatar_url' as avatar_url,
  au.raw_app_meta_data as raw_app_meta_data,
  au.raw_user_meta_data as raw_user_meta_data
from
  public.user_profiles as up
  left join auth.users as au on up.uid = au.id