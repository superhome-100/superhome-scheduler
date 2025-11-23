-- Create assignment_queue table
create table if not exists public.assignment_queue (
  res_date date not null,
  time_period text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (res_date, time_period)
);

-- Enable RLS (Admin only)
alter table public.assignment_queue enable row level security;
create policy "Admin full access" on public.assignment_queue
  for all
  to authenticated
  using (
    exists (
      select 1 from public.user_profiles
      where uid = auth.uid()
      and privileges @> '{"admin"}'::text[]
    )
  );

-- RPC to claim the next pending job atomically
create or replace function public.claim_assignment_job()
returns table (res_date date, time_period text)
language plpgsql
security definer
as $$
begin
  return query
  update public.assignment_queue
  set status = 'processing',
      updated_at = now()
  where (res_date, time_period) in (
    select q.res_date, q.time_period
    from public.assignment_queue q
    where q.status = 'pending'
    -- Optional: Retry stuck 'processing' jobs after 5 minutes
    or (q.status = 'processing' and q.updated_at < now() - interval '5 minutes')
    order by q.updated_at asc
    limit 1
    for update skip locked
  )
  returning public.assignment_queue.res_date, public.assignment_queue.time_period;
end;
$$;

-- RPC to complete a job
create or replace function public.complete_assignment_job(p_res_date date, p_time_period text, p_status text default 'completed')
returns void
language plpgsql
security definer
as $$
begin
  update public.assignment_queue
  set status = p_status,
      updated_at = now()
  where res_date = p_res_date and time_period = p_time_period;
end;
$$;

-- Update the trigger function to just queue jobs
-- Processing happens via periodic Edge Function invocation
create or replace function public.invoke_auto_assign_buoy()
returns trigger
language plpgsql
security definer
as $$
declare
  v_res_date date;
  v_time_period varchar;
  v_uid uuid;
begin
  -- 1. Determine context
  if (TG_OP = 'DELETE') then
    v_uid := OLD.uid;
    v_res_date := OLD.res_date;
  else
    v_uid := NEW.uid;
    v_res_date := NEW.res_date;
  end if;

  -- 2. Get time_period
  select time_period into v_time_period
  from public.res_openwater
  where uid = v_uid and res_date = v_res_date;

  -- 3. If valid, queue the job
  if v_time_period is not null then
    -- Upsert into queue: If exists, reset to 'pending' so it gets picked up again
    insert into public.assignment_queue (res_date, time_period, status)
    values (v_res_date, v_time_period, 'pending')
    on conflict (res_date, time_period) 
    do update set status = 'pending', updated_at = now();
  end if;

  return null;
end;
$$;
