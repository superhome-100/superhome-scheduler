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
      .select('uid, res_date, depth_m, auto_adjust_closest, paired_uid')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single();

    if (owErr) return json({ error: owErr.message }, { status: 404 });

    // Already paired
    if (myOW.paired_uid) return json({ result: 'already_paired', paired_uid: myOW.paired_uid }, { status: 200 });
    if (myOW.depth_m == null) return json({ result: 'noop_no_depth' }, { status: 200 });

    const resDate = new Date(body.res_date);
    const dayStart = new Date(resDate);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

    // 1) Try exact depth matches
    const { data: exactCandidates, error: exactErr } = await supabase
      .from('res_openwater')
      .select('uid, depth_m, paired_uid, res_date, reservations!inner(res_status, res_type, created_at)')
      .neq('uid', body.uid)
      .is('paired_uid', null)
      .eq('depth_m', myOW.depth_m)
      .gte('res_date', dayStart.toISOString())
      .lt('res_date', dayEnd.toISOString())
      .order('reservations(created_at)', { ascending: true });

    if (exactErr) return json({ error: exactErr.message }, { status: 500 });

    let candidate = exactCandidates?.[0];

    // 2) Try nearest depth if allowed
    if (!candidate && myOW.auto_adjust_closest) {
      const { data: nearCandidates, error: nearErr } = await supabase
        .from('res_openwater')
        .select('uid, depth_m, paired_uid, res_date, reservations!inner(res_status, res_type, created_at)')
        .neq('uid', body.uid)
        .is('paired_uid', null)
        .gte('res_date', dayStart.toISOString())
        .lt('res_date', dayEnd.toISOString());

      if (nearErr) return json({ error: nearErr.message }, { status: 500 });

      const filtered = (nearCandidates || [])
        .filter((c: any) => c.reservations?.res_status === 'confirmed' && c.reservations?.res_type === 'open_water' && c.depth_m != null)
        .sort((a: any, b: any) => {
          const da = Math.abs(a.depth_m - myOW.depth_m);
          const db = Math.abs(b.depth_m - myOW.depth_m);
          if (da !== db) return da - db;
          const ta = new Date(a.reservations.created_at).getTime();
          const tb = new Date(b.reservations.created_at).getTime();
          return ta - tb;
        });

      candidate = filtered[0];
    }

    if (!candidate) return json({ result: 'no_candidate_found' }, { status: 200 });

    // Pair both sides
    const nowIso = new Date().toISOString();

    const { error: upd1 } = await supabase
      .from('res_openwater')
      .update({ paired_uid: candidate.uid, paired_at: nowIso })
      .eq('uid', body.uid)
      .eq('res_date', body.res_date);

    if (upd1) return json({ error: upd1.message }, { status: 500 });

    const { error: upd2 } = await supabase
      .from('res_openwater')
      .update({ paired_uid: body.uid, paired_at: nowIso })
      .eq('uid', candidate.uid)
      .eq('res_date', body.res_date);

    if (upd2) return json({ error: upd2.message }, { status: 500 });

    return json({ result: 'paired', pairedWith: candidate.uid }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, { status: 500 });
  }
});
