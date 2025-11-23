-- Update the cron wrapper to call auto-assign-buoy directly
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

  -- Append the auto-assign-buoy function path (changed from process-assignment-queue)
  v_url := v_url || '/functions/v1/auto-assign-buoy';

  -- Make the HTTP request with action='process_queue'
  -- No authorization needed - function is idempotent and publicly safe
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', 'process_queue')
  );
  
exception
  when others then
    raise warning 'cron_process_assignment_queue failed: %', sqlerrm;
end;
$$;
