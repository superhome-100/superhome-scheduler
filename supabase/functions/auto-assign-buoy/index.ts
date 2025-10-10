// Supabase Edge Function: auto-assign-buoy
// - Admin-only function
// - Groups confirmed/pending open-water reservations by depth proximity (<=15m) and creates buoy groups
// - Finds the best buoy by max_depth >= group max depth
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface Payload {
  res_date: string; // 'YYYY-MM-DD'
  time_period: string; // 'AM' | 'PM' | etc
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    ...init
  });
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Auth
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Admin check
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single();
    if (profileErr) return json({ error: profileErr.message }, { status: 403 });
    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin');
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as Payload;
    if (!body?.res_date || !body?.time_period) return json({ error: 'Invalid payload' }, { status: 400 });

    console.log(`Auto-assigning buoys for ${body.res_date} ${body.time_period}`);

    // Use the fixed RPC function instead of client-side grouping
    const { data: rpcResult, error: rpcErr } = await supabase.rpc('auto_assign_buoy', {
      p_res_date: body.res_date,
      p_time_period: body.time_period
    });

    if (rpcErr) {
      console.error('RPC auto_assign_buoy error:', rpcErr);
      return json({ error: rpcErr.message }, { status: 500 });
    }

    const createdGroupIds = rpcResult?.createdGroupIds || [];
    const skipped = rpcResult?.skipped || [];

    return json({ createdGroupIds, skipped: skipped.length ? skipped : undefined }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, { status: 500 });
  }
});
