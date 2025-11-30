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

    // No authentication required - function is idempotent and safe to call publicly
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = (await req.json()) as Payload | { action?: string };
    
    // Check if this is a queue processing request
    if ('action' in body && body.action === 'process_queue') {
      // Process all pending jobs in the queue
      let processed = 0;
      let failed = 0;
      
      while (true) {
        // Claim next job
        const { data: jobs, error: claimError } = await supabase.rpc('claim_assignment_job');
        
        if (claimError) {
          console.error('Error claiming job:', claimError);
          break;
        }
        
        if (!jobs || jobs.length === 0) {
          // No more pending jobs
          break;
        }
        
        const job = jobs[0];
        
        try {
          // Process this job
          await processAssignment(supabase, job.res_date, job.time_period);
          
          // Mark as completed
          await supabase.rpc('complete_assignment_job', {
            p_res_date: job.res_date,
            p_time_period: job.time_period,
            p_status: 'completed'
          });
          
          processed++;
        } catch (error) {
          console.error(`Error processing job ${job.res_date} ${job.time_period}:`, error);
          
          // Mark as failed
          await supabase.rpc('complete_assignment_job', {
            p_res_date: job.res_date,
            p_time_period: job.time_period,
            p_status: 'failed'
          });
          
          failed++;
        }
      }
      
      return json({ 
        success: true, 
        processed, 
        failed 
      }, { status: 200 });
    }
    
    // Direct invocation mode (manual): queue job then process immediately
    if (!('res_date' in body) || !('time_period' in body) || !body.res_date || !body.time_period) {
      return json({ error: 'Invalid payload' }, { status: 400 });
    }

    const dateOnly = String(body.res_date).split('T')[0];

    // Upsert into assignment_queue so manual triggers also populate the queue
    const { error: queueErr } = await supabase
      .from('assignment_queue')
      .upsert(
        {
          res_date: dateOnly,
          time_period: body.time_period,
          status: 'pending',
        },
        { onConflict: 'res_date,time_period' },
      );

    if (queueErr) {
      console.error('[auto-assign-buoy] Failed to enqueue assignment job', queueErr.message ?? queueErr);
      // Continue with processing anyway so manual calls still work even if queue write fails
    }

    const result = await processAssignment(supabase, dateOnly, body.time_period);
    return json(result, { status: 200 });

  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    console.error('Auto-assign error:', message);
    return json({ error: message }, { status: 500 });
  }
});

// Extract assignment logic into a separate function
async function processAssignment(supabase: any, res_date: string, time_period: string) {
  console.log(`Auto-assigning buoys for ${res_date} ${time_period}`);

  // Normalize to a UTC day window for res_date filtering
  const dayStart = new Date(res_date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1);

  // 1. Fetch Reservations (now including buoy column)
  const { data: reservations, error: resErr } = await supabase
    .from('res_openwater')
    .select(`
      uid,
      depth_m,
      open_water_type,
      buoy,
      reservations!inner (
        res_status,
        res_type
      )
    `)
    .eq('time_period', time_period)
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString())
    .eq('reservations.res_type', 'open_water')
    .in('reservations.res_status', ['confirmed', 'pending'])
    .order('depth_m', { ascending: true });

  if (resErr) throw new Error(`Error fetching reservations: ${resErr.message}`);

  // Flatten data
  interface ReservationWithBuoy extends Reservation {
    buoy: string | null;
  }
  
  const validReservations: ReservationWithBuoy[] = (reservations || [])
    .map((r: any) => ({
      uid: r.uid,
      depth_m: r.depth_m,
      open_water_type: r.open_water_type,
      buoy: r.buoy,
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

  // Track assigned buoys to avoid double-assignment
  const assignedBuoyNames = new Set<string>();

  // Helper to find best available buoy
  const findBuoy = (depth: number): string | null => {
    // Filter suitable buoys
    const suitable = availableBuoys.filter(b => b.max_depth >= depth);
    
    // Try to find an unused one first
    const unused = suitable.find(b => !assignedBuoyNames.has(b.buoy_name));
    if (unused) {
      return unused.buoy_name;
    }
    
    // If all suitable buoys are used, we cannot assign a new group
    // This prevents "assigning buoys multiple times"
    return null;
  };

  // 3. Grouping Logic
  const groups: GroupResult[] = [];
  const skipped: any[] = [];
  const assigned = new Set<string>();

  // STEP 1: Process Course Coaching (1 per group, respect preferred buoy)
  const courseCoaching = validReservations.filter(r => r.open_water_type === 'course_coaching');
  for (const res of courseCoaching) {
    // If preferred buoy is set, use it (even if used). Otherwise find unused.
    const buoyName = res.buoy || findBuoy(res.depth_m); 
    
    if (buoyName) {
      groups.push({
        buoy_name: buoyName,
        open_water_type: res.open_water_type,
        uids: [res.uid]
      });
      assigned.add(res.uid);
      assignedBuoyNames.add(buoyName); // Mark as used
    } else {
      skipped.push({ reason: 'no_buoy_available', uids: [res.uid] });
    }
  }

  // STEP 2: Process non-coaching reservations
  const others = validReservations.filter(r => 
    r.open_water_type !== 'course_coaching' && 
    !assigned.has(r.uid)
  );

  // Separate anchored (have an explicit buoy set) and flexible (no preference)
  const anchored = others.filter(r => r.buoy !== null);
  const flexible = others.filter(r => r.buoy === null);

  // STEP 3: For anchored reservations, create or reuse a group per (buoy_name, type)
  // without adding additional flexible members. This ensures that once a buoy is
  // explicitly set (via res_openwater.buoy or locking), auto-assign respects that
  // choice and does not reshuffle those members.

  const anchoredGroupsMap = new Map<string, ReservationWithBuoy[]>();

  const makeAnchorKey = (buoyName: string, type: string) => `${buoyName}__${type}`;

  for (const res of anchored) {
    const buoyName = res.buoy!;
    const key = makeAnchorKey(buoyName, res.open_water_type);
    const list = anchoredGroupsMap.get(key) ?? [];
    list.push(res);
    anchoredGroupsMap.set(key, list);

    assigned.add(res.uid);
    assignedBuoyNames.add(buoyName); // Mark this buoy as already used for group creation
  }

  for (const [key, members] of anchoredGroupsMap.entries()) {
    if (!members.length) continue;
    const [buoyName, type] = key.split('__');

    groups.push({
      buoy_name: buoyName,
      open_water_type: type,
      uids: members.map(m => m.uid)
    });
  }

  // STEP 4: Auto-group remaining flexible reservations (existing algorithm)
  const remaining = flexible.filter(r => !assigned.has(r.uid));
  
  // Sort by type then depth
  remaining.sort((a, b) => {
    if (a.open_water_type !== b.open_water_type) 
      return a.open_water_type.localeCompare(b.open_water_type);
    return a.depth_m - b.depth_m;
  });

  let currentGroup: ReservationWithBuoy[] = [];
  
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
      assignedBuoyNames.add(buoyName); // Mark as used
    } else {
      skipped.push({ reason: 'no_buoy_available', uids: currentGroup.map(r => r.uid) });
    }
    currentGroup = [];
  };

  for (const res of remaining) {
    if (currentGroup.length === 0) {
      currentGroup.push(res);
    } else {
      const groupType = currentGroup[0].open_water_type;
      const groupMaxDepth = Math.max(...currentGroup.map(r => r.depth_m));
      const depthDiff = Math.abs(res.depth_m - groupMaxDepth);
      
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
  flushGroup();

  // 5. Save Results (Atomic RPC)
  const { error: saveErr } = await supabase.rpc('_save_buoy_groups', {
    p_res_date: res_date,
    p_time_period: time_period,
    p_groups: groups
  });

  if (saveErr) throw new Error(`Error saving groups: ${saveErr.message}`);

  // 6. Cleanup: remove any buoy_group rows for this slot that are no longer
  // referenced by res_openwater. This prevents stale/empty groups from
  // lingering after re-assignments.

  const { data: groupRows, error: groupErr } = await supabase
    .from('buoy_group')
    .select('id, res_openwater ( reservation_id )')
    .eq('time_period', time_period)
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString());

  if (groupErr) {
    console.error('Error loading buoy_group rows for cleanup:', groupErr.message ?? groupErr);
  } else {
    const orphanIds = (groupRows || [])
      .filter((g: any) => !g.res_openwater || (Array.isArray(g.res_openwater) && g.res_openwater.length === 0))
      .map((g: any) => g.id as number);

    if (orphanIds.length > 0) {
      const { error: deleteErr } = await supabase
        .from('buoy_group')
        .delete()
        .in('id', orphanIds);

      if (deleteErr) {
        console.error('Error deleting orphan buoy_group rows:', deleteErr.message ?? deleteErr);
      }
    }
  }

  return { 
    success: true, 
    groupsCreated: groups.length, 
    skippedCount: skipped.length,
    skipped 
  };
}

