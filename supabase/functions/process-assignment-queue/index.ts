// Supabase Edge Function: process-assignment-queue
// - Periodically invoked (e.g., every minute via cron or GitHub Actions)
// - Processes pending assignment jobs from the queue
// - Calls auto-assign-buoy in queue mode

import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  });
}

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req)
    if (pre) return pre

    // Call auto-assign-buoy in queue processing mode
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/auto-assign-buoy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ action: 'process_queue' })
    });

    const result = await response.json();
    
    return json(result, { status: response.status });

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('Queue processor error:', message);
    return json({ error: message }, { status: 500 });
  }
});
