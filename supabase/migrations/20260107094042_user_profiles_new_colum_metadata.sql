ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS metadata jsonb NULL;
