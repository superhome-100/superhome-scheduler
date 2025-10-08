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

    // Fetch candidate open-water reservations for the date/period with depth
    const dayStartIso = new Date(`${body.res_date}T00:00:00.000Z`).toISOString();
    const dayEnd = new Date(`${body.res_date}T00:00:00.000Z`);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    const dayEndIso = dayEnd.toISOString();

    const { data: candidatesRaw, error: candErr } = await supabase
      .from('res_openwater')
      .select('uid, res_date, depth_m, time_period, reservations!inner(res_status)')
      .eq('time_period', body.time_period)
      .gte('res_date', dayStartIso)
      .lt('res_date', dayEndIso)
      .not('depth_m', 'is', null)
      .order('depth_m', { ascending: true });

    if (candErr) return json({ error: candErr.message }, { status: 500 });

    // Filter to pending (as in previous SQL) or include confirmed depending on policy
    const candidates = (candidatesRaw || []).filter((c: any) => c.reservations?.res_status === 'pending');

    // Group by <=15m from first member and max size 3
    const groups: string[][] = [];
    const depths: number[][] = [];
    for (const c of candidates) {
      const d = c.depth_m as number;
      if (!groups.length || groups[groups.length - 1].length >= 3) {
        groups.push([c.uid]);
        depths.push([d]);
        continue;
      }
      const lastDepths = depths[depths.length - 1];
      const anchor = lastDepths[0];
      if (Math.abs(d - anchor) <= 15 && groups[groups.length - 1].length < 3) {
        groups[groups.length - 1].push(c.uid);
        lastDepths.push(d);
      } else {
        groups.push([c.uid]);
        depths.push([d]);
      }
    }

    // Load buoy config
    const { data: buoys, error: buoyErr } = await supabase
      .from('buoy')
      .select('buoy_name, max_depth')
      .order('max_depth', { ascending: true });

    if (buoyErr) return json({ error: buoyErr.message }, { status: 500 });

    let createdGroupIds: number[] = [];
    const skipped: Array<{ reason: string; uids: string[] }> = [];

    for (let i = 0; i < groups.length; i++) {
      const uids = groups[i];
      if (!uids.length) continue;

      // Find max depth in group
      const maxDepth = Math.max(...depths[i]);
      const best = (buoys || []).find(b => (b.max_depth as number) >= maxDepth);

      if (!best) {
        skipped.push({ reason: 'no_buoy_available', uids });
        continue;
      }

      // Create buoy_group
      const { data: groupRow, error: createErr } = await supabase
        .from('buoy_group')
        .insert({ res_date: body.res_date, time_period: body.time_period, buoy_name: best.buoy_name })
        .select('id')
        .single();

      if (createErr || !groupRow?.id) {
        skipped.push({ reason: createErr?.message || 'create_group_failed', uids });
        continue;
      }

      const groupId = groupRow.id as number;

      // Insert up to 3 members
      for (const uid of uids.slice(0, 3)) {
        const { error: memErr } = await supabase
          .from('buoy_group_members')
          .insert({ group_id: groupId, uid });
        if (memErr) {
          // Continue; let RLS/constraints enforce limits
        }
      }

      createdGroupIds.push(groupId);
    }

    return json({ createdGroupIds, skipped: skipped.length ? skipped : undefined }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, { status: 500 });
  }
});
