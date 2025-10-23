import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

// Standardized message to match client constant
const MSG_NO_CLASSROOMS = 'No classrooms available for the selected time window';

interface ApproveRequest {
  uid: string;
  res_date: string; // ISO string
}

function getDateOnly(raw: string): string {
  // Accept formats like 'YYYY-MM-DDTHH:mm:ssZ' or 'YYYY-MM-DD HH:mm:ss+00'
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : raw.split('T')[0];
}

function toMinutesFlexible(raw: string): number {
  if (!raw) return NaN;
  // Handle ISO or date-time: take time part after 'T'
  let t = raw;
  const tIndex = raw.indexOf('T');
  if (tIndex !== -1) {
    t = raw.slice(tIndex + 1);
  }
  // Keep only HH:mm[:ss]
  const match = t.match(/^(\d{2}):(\d{2})(?::\d{2})?/);
  if (!match) return NaN;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  return h * 60 + m;
}

function timeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const aS = toMinutesFlexible(aStart);
  const aE = toMinutesFlexible(aEnd);
  const bS = toMinutesFlexible(bStart);
  const bE = toMinutesFlexible(bEnd);
  if (Number.isNaN(aS) || Number.isNaN(aE) || Number.isNaN(bS) || Number.isNaN(bE)) return false;
  return aS < bE && aE > bS;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: ApproveRequest = await req.json();
    const { uid, res_date } = body || {};
    if (!uid || !res_date) {
      return new Response(JSON.stringify({ error: 'uid and res_date are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Load target reservation with classroom details
    const { data: target, error: targetErr } = await supabase
      .from('reservations')
      .select(`
        uid, res_date, res_type, res_status,
        res_classroom(start_time, end_time, room)
      `)
      .eq('uid', uid)
      .eq('res_date', res_date)
      .single();

    if (targetErr || !target) {
      return new Response(JSON.stringify({ error: targetErr?.message || 'Reservation not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (target.res_type !== 'classroom') {
      return new Response(JSON.stringify({ error: 'Only classroom reservations can be approved here' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const start_time: string | null = target.res_classroom?.start_time ?? null;
    const end_time: string | null = target.res_classroom?.end_time ?? null;
    if (!start_time || !end_time) {
      return new Response(JSON.stringify({ error: 'Missing classroom start/end times' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch overlapping classroom reservations (pending + confirmed) for same calendar date
    const dateOnly = getDateOnly(String(target.res_date));
    const from = `${dateOnly} 00:00:00+00`;
    const to = `${dateOnly} 23:59:59+00`;
    const { data: overlaps, error: overErr } = await supabase
      .from('reservations')
      .select(`
        uid, res_date, res_status,
        res_classroom(start_time, end_time, room)
      `)
      .eq('res_type', 'classroom')
      .gte('res_date', from)
      .lte('res_date', to)
      .in('res_status', ['pending', 'confirmed']);

    if (overErr) {
      return new Response(JSON.stringify({ error: overErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Compute overlaps with our timeslot, excluding the target itself
    const overlapping = (overlaps || []).filter((r: any) => {
      if (r.uid === uid && String(r.res_date) === String(target.res_date)) return false;
      const s = r?.res_classroom?.start_time;
      const e = r?.res_classroom?.end_time;
      if (!s || !e) return false;
      return timeOverlap(start_time, end_time, s, e);
    });

    // Capacity (temporary static). TODO: replace with settings table once available.
    const CAPACITY = 3;

    // Determine taken rooms among confirmed overlapping only
    const taken = new Set<string>();
    for (const r of overlapping) {
      if (r.res_status === 'confirmed') {
        const room = r?.res_classroom?.room;
        if (room) taken.add(String(room));
      }
    }

    // Auto-assign first available room
    const ROOM_LIST = ['1', '2', '3']; // TODO: read from settings when implemented
    const chosen = ROOM_LIST.find(r => !taken.has(r));
    if (!chosen) {
      return new Response(JSON.stringify({ error: MSG_NO_CLASSROOMS }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update classroom details room
    const { error: updClassErr } = await supabase
      .from('res_classroom')
      .update({ room: chosen })
      .eq('uid', uid)
      .eq('res_date', target.res_date);

    if (updClassErr) {
      return new Response(JSON.stringify({ error: updClassErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Update reservation status to confirmed
    const { error: updResErr } = await supabase
      .from('reservations')
      .update({ res_status: 'confirmed' })
      .eq('uid', uid)
      .eq('res_date', target.res_date);

    if (updResErr) {
      return new Response(JSON.stringify({ error: updResErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: true, room: chosen }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('reservations-approve error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
