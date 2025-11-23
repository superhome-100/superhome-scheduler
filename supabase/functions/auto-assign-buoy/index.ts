/// <reference path="../types.d.ts" />
// Supabase Edge Function: auto-assign-buoy
// - Triggered by database changes (via pg_net) or manual admin call
// - Groups confirmed/pending open-water reservations
// - Handles 'course_coaching' separately
// - Groups others by depth proximity (<=15m) and max size 3
// - Saves results atomically via RPC

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface Payload {
  res_date: string; // 'YYYY-MM-DD'
  time_period: string; // 'AM' | 'PM' | etc
}

interface Reservation {
  uid: string;
  depth_m: number;
  open_water_type: string;
  res_status: string;
}

interface Buoy {
  buoy_name: string;
  max_depth: number;
}

interface GroupResult {
  buoy_name: string;
  open_water_type: string;
  uids: string[];
}

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

    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 });

    // Create Supabase client
    // Note: When triggered by pg_net, we might not have a user session, so we use the service role key if available
    // OR we rely on the fact that this function is internal/admin-only.
    // For database triggers, we usually use the service role key.
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json()) as Payload;
    if (!body?.res_date || !body?.time_period) return json({ error: 'Invalid payload' }, { status: 400 });

    console.log(`Auto-assigning buoys for ${body.res_date} ${body.time_period}`);

    // 1. Fetch Reservations
    const { data: reservations, error: resErr } = await supabase
      .from('res_openwater')
      .select(`
        uid,
        depth_m,
        open_water_type,
        reservations!inner (
          res_status,
          res_type
        )
      `)
      .eq('res_date', body.res_date)
      .eq('time_period', body.time_period)
      .eq('reservations.res_type', 'open_water')
      .in('reservations.res_status', ['confirmed', 'pending']) // Include pending
      .order('depth_m', { ascending: true });

    if (resErr) throw new Error(`Error fetching reservations: ${resErr.message}`);

    // Flatten data
    const validReservations: Reservation[] = (reservations || [])
      .map((r: any) => ({
        uid: r.uid,
        depth_m: r.depth_m,
        open_water_type: r.open_water_type,
        res_status: r.reservations.res_status
      }))
      .filter(r => r.depth_m !== null && r.open_water_type !== null);

    // 2. Fetch Buoys
    const { data: buoys, error: buoyErr } = await supabase
      .from('buoy')
      .select('buoy_name, max_depth')
      .order('max_depth', { ascending: true });

    if (buoyErr) throw new Error(`Error fetching buoys: ${buoyErr.message}`);
    const availableBuoys = buoys as Buoy[];

    // 3. Grouping Logic
    const groups: GroupResult[] = [];
    const skipped: any[] = [];

    // Helper to find best buoy
    const findBuoy = (depth: number): string | null => {
      const buoy = availableBuoys.find(b => b.max_depth >= depth);
      return buoy ? buoy.buoy_name : null;
    };

    // Separate course_coaching
    const courseCoaching = validReservations.filter(r => r.open_water_type === 'course_coaching');
    const others = validReservations.filter(r => r.open_water_type !== 'course_coaching');

    // Process Course Coaching (1 per group)
    for (const res of courseCoaching) {
      const buoyName = findBuoy(res.depth_m);
      if (buoyName) {
        groups.push({
          buoy_name: buoyName,
          open_water_type: res.open_water_type,
          uids: [res.uid]
        });
      } else {
        skipped.push({ reason: 'no_buoy_available', uids: [res.uid] });
      }
    }

    // Process Others (Group by type & depth)
    // Sort by type then depth
    others.sort((a, b) => {
      if (a.open_water_type !== b.open_water_type) return a.open_water_type.localeCompare(b.open_water_type);
      return a.depth_m - b.depth_m;
    });

    let currentGroup: Reservation[] = [];
    
    const flushGroup = () => {
      if (currentGroup.length === 0) return;
      
      const maxDepth = Math.max(...currentGroup.map(r => r.depth_m));
      const type = currentGroup[0].open_water_type;
      const buoyName = findBuoy(maxDepth);
      
      if (buoyName) {
        groups.push({
          buoy_name: buoyName,
          open_water_type: type,
          uids: currentGroup.map(r => r.uid)
        });
      } else {
        skipped.push({ reason: 'no_buoy_available', uids: currentGroup.map(r => r.uid) });
      }
      currentGroup = [];
    };

    for (const res of others) {
      if (currentGroup.length === 0) {
        currentGroup.push(res);
      } else {
        const groupType = currentGroup[0].open_water_type;
        const groupMaxDepth = Math.max(...currentGroup.map(r => r.depth_m));
        const depthDiff = Math.abs(res.depth_m - groupMaxDepth);
        
        // Check conditions: Same type, size < 3, depth diff <= 15 (or size is 1)
        if (
          res.open_water_type === groupType &&
          currentGroup.length < 3 &&
          (depthDiff <= 15 || currentGroup.length === 1)
        ) {
          currentGroup.push(res);
        } else {
          flushGroup();
          currentGroup.push(res);
        }
      }
    }
    flushGroup(); // Flush last group

    // 4. Save Results (Atomic RPC)
    const { error: saveErr } = await supabase.rpc('_save_buoy_groups', {
      p_res_date: body.res_date,
      p_time_period: body.time_period,
      p_groups: groups
    });

    if (saveErr) throw new Error(`Error saving groups: ${saveErr.message}`);

    return json({ 
      success: true, 
      groupsCreated: groups.length, 
      skippedCount: skipped.length,
      skipped 
    }, { status: 200 });

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('Auto-assign error:', message);
    return json({ error: message }, { status: 500 });
  }
});
