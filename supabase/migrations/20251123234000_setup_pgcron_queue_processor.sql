-- Enable pg_cron extension
create extension if not exists pg_cron with schema extensions;

-- Create config table for environment-specific settings
create table if not exists public.system_config (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

-- Enable RLS (Admin only)
alter table public.system_config enable row level security;

create policy "Admin full access to config" on public.system_config
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where uid = auth.uid()
      and privileges @> '{"admin"}'::text[]
    )
  );

-- Insert default configuration
-- For local development, use kong URL
-- For production, this needs to be updated to the actual Supabase URL
insert into public.system_config (key, value, description)
values 
  ('supabase_url', 'http://kong:8000', 'Base URL for Supabase functions (update for production)'),
  ('cron_enabled', 'true', 'Whether the assignment queue processor cron job is enabled')
on conflict (key) do nothing;

-- Create a function to process the queue (wrapper for HTTP call)
create or replace function public.cron_process_assignment_queue()
returns void
language plpgsql
security definer
as $$
declare
  v_url text;
  v_service_key text;
  v_enabled text;
begin
  -- Check if cron is enabled
  select value into v_enabled from public.system_config where key = 'cron_enabled';
  if v_enabled is null or v_enabled != 'true' then
    return;
  end if;

  -- Get base URL from config
  select value into v_url from public.system_config where key = 'supabase_url';
  
  if v_url is null then
    raise warning 'supabase_url not configured in system_config';
    return;
  end if;

  -- Append the function path
  v_url := v_url || '/functions/v1/process-assignment-queue';

  -- Get service role key from current setting (if available)
  -- In production, this should be set via ALTER DATABASE or connection string
  v_service_key := current_setting('app.supabase_service_role_key', true);
  
  -- If not available, try to get from config table (less secure, but works)
  if v_service_key is null or v_service_key = '' then
    select value into v_service_key from public.system_config where key = 'service_role_key';
  end if;

  -- Make the HTTP request
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(v_service_key, '')
    ),
    body := '{}'::jsonb
  );
  
exception
  when others then
    raise warning 'cron_process_assignment_queue failed: %', sqlerrm;
end;
$$;

-- Schedule the cron job to run every minute
-- Note: cron.schedule returns a job ID (bigint), but we're not storing it
select cron.schedule(
  'process-assignment-queue',  -- job name
  '* * * * *',                  -- every minute
  $$select public.cron_process_assignment_queue();$$
);

-- Grant execute permission to postgres role (needed for cron)
grant execute on function public.cron_process_assignment_queue() to postgres;

-- Note: To view scheduled jobs, run: SELECT * FROM cron.job;
-- To unschedule: SELECT cron.unschedule('process-assignment-queue');
