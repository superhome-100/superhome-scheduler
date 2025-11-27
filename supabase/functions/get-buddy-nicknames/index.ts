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
    if (!isAdmin) {
      return json({ error: 'Forbidden' }, { status: 403 });
    }

    // Locate the open water reservation detail row by reservation_id
    const { data: owRow, error: owErr } = await serviceSupabase
      .from('res_openwater')
      .select('uid, buddy_group_id')
      .eq('reservation_id', body.reservation_id)
      .maybeSingle();

    if (owErr) {
      console.error('[get-buddy-nicknames] Error loading res_openwater', owErr.message);
      return json({ error: owErr.message }, { status: 400 });
    }

    if (!owRow) {
      console.warn('[get-buddy-nicknames] No res_openwater row found for reservation', {
        reservation_id: body.reservation_id,
      });
      return json({ error: 'Open water reservation not found' }, { status: 404 });
    }

    const ownerUid = owRow.uid as string;
    const buddyGroupId = owRow.buddy_group_id as string | null;

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
            .filter((m: any) => m.status === 'accepted')
            .map((m: any) => m.uid as string),
        ),
      );
    }

    // If there is no buddy group or it has no accepted members, fall back to just the owner
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

    const nicknames = memberUids
      .map((uid) => {
        const entry = nameMap.get(uid);
        if (!entry) return null;
        const display = entry.nickname || entry.name;
        return display && String(display).trim() !== '' ? String(display).trim() : null;
      })
      .filter((n): n is string => !!n);

    return json(nicknames, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('[get-buddy-nicknames] Unhandled error', message);
    return json({ error: message }, { status: 500 });
  }
});
