// Supabase Edge Function: openwater-auto-pair
// - Authenticated caller; allowed if admin or owner of the reservation
// - Pairs open-water reservations based on depth (exact, then nearest if auto_adjust_closest)
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

type Status = 'pending' | 'confirmed' | 'rejected';

interface Payload {
  uid: string;
  res_date: string; // ISO string
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

    // Get user context
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as Payload;
    if (!body?.uid || !body?.res_date) return json({ error: 'Invalid payload' }, { status: 400 });

    // Check admin or owner
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('uid, privileges')
      .eq('uid', user.id)
      .single();

    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin');
    const isOwner = user.id === body.uid;
    if (!isAdmin && !isOwner) return json({ error: 'Forbidden' }, { status: 403 });

    // Fetch parent reservation
    const { data: reservation, error: resErr } = await supabase
      .from('reservations')
      .select('uid, res_date, res_type, res_status, created_at')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single();

    if (resErr) return json({ error: resErr.message }, { status: 404 });
    if (reservation.res_type !== 'open_water') return json({ result: 'noop_not_open_water' }, { status: 200 });
    if ((reservation.res_status as Status) !== 'confirmed') return json({ result: 'noop_not_confirmed' }, { status: 200 });

    // Fetch openwater details for caller
    const { data: myOW, error: owErr } = await supabase
      .from('res_openwater')
      .select('uid, res_date, depth_m, auto_adjust_closest, group_id')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single();

    if (owErr) return json({ error: owErr.message }, { status: 404 });

    // Already assigned to a group
    if (myOW.group_id) return json({ result: 'already_grouped', group_id: myOW.group_id }, { status: 200 });
    if (myOW.depth_m == null) return json({ result: 'noop_no_depth' }, { status: 200 });

    const resDate = new Date(body.res_date);
    const dayStart = new Date(resDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

    // This function is now deprecated since we use group-based assignments
    // The auto-assign-buoy function handles grouping automatically
    return json({ result: 'deprecated_use_auto_assign_buoy' }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, { status: 500 });
  }
});
