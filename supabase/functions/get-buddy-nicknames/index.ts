// Supabase Edge Function: get-buddy-nicknames
// Given a reservation_id, returns an array of nicknames (or names) for the
// associated diver and their buddy group members, if any.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface Payload {
  reservation_id: number;
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init,
  });
}

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req);
    if (pre) return pre;

    if (req.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as Payload;
    if (!body || typeof body.reservation_id !== 'number') {
      return json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Ensure caller is admin (same pattern as reservations-create / openwater-move-buoy)
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .maybeSingle();

    if (profileErr) {
      return json({ error: profileErr.message }, { status: 403 });
    }

    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin');
    // Admin check removed here to allow Owners to proceed.
    // Privileges are verified below (Admin OR Owner).

    // Verify caller privileges: Admin OR Owner
    const { data: resMeta, error: resMetaErr } = await serviceSupabase
      .from('reservations')
      .select('uid, res_type')
      .eq('reservation_id', body.reservation_id)
      .maybeSingle();

    if (resMetaErr) {
      return json({ error: resMetaErr.message }, { status: 400 });
    }
    if (!resMeta) {
      return json({ error: 'Reservation not found' }, { status: 404 });
    }

    const isOwner = user.id === resMeta.uid;
    // We already checked isAdmin above (but using single profile query). 
    // Let's rely on that isAdmin boolean. 
    // Extend permission: Admin OR Owner
    if (!isAdmin && !isOwner) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    const ownerUid = resMeta.uid;
    let buddyGroupId: string | null = null;

    // Fetch buddy_group_id from specific detail table based on res_type
    if (resMeta.res_type === 'open_water') {
      const { data: owRow, error: owErr } = await serviceSupabase
        .from('res_openwater')
        .select('buddy_group_id')
        .eq('reservation_id', body.reservation_id)
        .maybeSingle();
      if (owErr) console.error('[get-buddy-nicknames] res_openwater error', owErr);
      buddyGroupId = owRow?.buddy_group_id || null;
    } else if (resMeta.res_type === 'pool') {
      const { data: plRow, error: plErr } = await serviceSupabase
        .from('res_pool')
        .select('buddy_group_id')
        .eq('reservation_id', body.reservation_id)
        .maybeSingle();
      if (plErr) console.error('[get-buddy-nicknames] res_pool error', plErr);
      buddyGroupId = plRow?.buddy_group_id || null;
    } else if (resMeta.res_type === 'classroom') {
      const { data: clRow, error: clErr } = await serviceSupabase
        .from('res_classroom')
        .select('buddy_group_id')
        .eq('reservation_id', body.reservation_id)
        .maybeSingle();
      if (clErr) console.error('[get-buddy-nicknames] res_classroom error', clErr);
      buddyGroupId = clRow?.buddy_group_id || null;
    }

    let memberUids: string[] = [];

    if (buddyGroupId) {
      const { data: members, error: membersErr } = await serviceSupabase
        .from('buddy_group_members')
        .select('uid, status')
        .eq('buddy_group_id', buddyGroupId);

      if (membersErr) {
        console.error('[get-buddy-nicknames] Error loading buddy_group_members', membersErr.message);
        return json({ error: membersErr.message }, { status: 400 });
      }

      memberUids = Array.from(
        new Set(
          (members ?? [])
            .filter((m: any) => m.status === 'accepted' || m.status === 'pending')
            .map((m: any) => m.uid as string),
        ),
      );
    }

    // If there is no buddy group or it has no accepted members, fall back to just the owner
    // (This behavior is preserved from original implementation)
    if (!memberUids.length) {
      memberUids = [ownerUid];
    } else if (!memberUids.includes(ownerUid)) {
      memberUids.unshift(ownerUid);
    }

    const { data: profiles, error: profErr } = await serviceSupabase
      .from('user_profiles')
      .select('uid, nickname, name')
      .in('uid', memberUids);

    if (profErr) {
      console.error('[get-buddy-nicknames] Error loading user_profiles', profErr.message);
      return json({ error: profErr.message }, { status: 400 });
    }

    const nameMap = new Map<string, { nickname: string | null; name: string | null }>();
    (profiles ?? []).forEach((p: any) => {
      nameMap.set(p.uid, { nickname: p.nickname ?? null, name: p.name ?? null });
    });

    const results = memberUids
      .map((uid) => {
        const entry = nameMap.get(uid);
        if (!entry) return null;
        const display = entry.nickname || entry.name;
        const displayName = display && String(display).trim() !== '' ? String(display).trim() : 'Unknown';
        return { uid, displayName };
      })
      .filter((n): n is { uid: string; displayName: string } => !!n);

    return json(results, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('[get-buddy-nicknames] Unhandled error', message);
    return json({ error: message }, { status: 500 });
  }
});
