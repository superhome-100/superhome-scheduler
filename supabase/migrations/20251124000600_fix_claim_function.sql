-- Fix ambiguous column reference in claim_assignment_job
create or replace function public.claim_assignment_job()
returns table (res_date date, time_period text)
language plpgsql
security definer
as $$
begin
  return query
  update public.assignment_queue aq
  set status = 'processing',
      updated_at = now()
  where (aq.res_date, aq.time_period) in (
    select q.res_date, q.time_period
    from public.assignment_queue q
    where q.status = 'pending'
    -- Optional: Retry stuck 'processing' jobs after 5 minutes
    or (q.status = 'processing' and q.updated_at < now() - interval '5 minutes')
    order by q.updated_at asc
    limit 1
    for update skip locked
  )
  returning aq.res_date, aq.time_period;
end;
$$;
