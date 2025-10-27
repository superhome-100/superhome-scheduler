// Supabase Edge Function: reservations-update
// - Owner or admin can update reservation parent fields and details
// - Triggers pairing via openwater-auto-pair when confirming open water

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { MSG_NO_POOL_LANES, MSG_NO_CLASSROOMS } from '../_shared/strings.ts'

// Cut-off rules (same as cutoffRules.ts)
const CUTOFF_RULES = {
  open_water: {
    cutoffTime: '18:00', // 6 PM
    description: 'Open water reservations must be made before 6 PM for next day'
  },
  pool: {
    cutoffMinutes: 30,
    description: 'Pool reservations must be made at least 30 minutes in advance'
  },
  classroom: {
    cutoffMinutes: 30,
    description: 'Classroom reservations must be made at least 30 minutes in advance'
  }
} as const

async function findAvailableRoom(
  supabase: any,
  res_date_iso: string,
  start_time: string | null,
  end_time: string | null,
  excludeUid: string
): Promise<string | null> {
  // Fetch all classroom reservations on the same calendar day, not just exact timestamp
  const date = new Date(res_date_iso)
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('res_classroom')
    .select('uid, room, start_time, end_time')
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString());

  if (error) {
    console.error('Error fetching existing classroom reservations:', error);
    return null;
  }

  const occupied: Record<string, boolean> = {};
  for (const row of data || []) {
    if (row.uid === excludeUid) continue;
    if (row.room && overlaps(row.start_time, row.end_time, start_time, end_time)) {
      occupied[row.room] = true;
    }
  }

  for (let room = 1; room <= 3; room++) {
    const key = String(room);
    if (!occupied[key]) return key;
  }
  return null;
}

type ReservationType = 'pool' | 'open_water' | 'classroom'

function getCutoffTime(res_type: ReservationType, reservationDate: string): Date {
  const resDate = new Date(reservationDate)
  
  if (res_type === 'open_water') {
    // 6 PM on the day before the reservation
    const cutoffDate = new Date(resDate)
    cutoffDate.setDate(cutoffDate.getDate() - 1)
    cutoffDate.setUTCHours(18, 0, 0, 0)
    return cutoffDate
  } else {
    // 30 minutes before reservation time
    const cutoffTime = new Date(resDate)
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 30)
    return cutoffTime
  }
}

function isBeforeCutoff(reservationDate: string, res_type: ReservationType): boolean {
  const resDate = new Date(reservationDate)
  const now = new Date()
  
  // For open water, check if it's same day (not allowed)
  if (res_type === 'open_water') {
    const today = new Date(now)
    today.setUTCHours(0, 0, 0, 0)
    const reservationDay = new Date(resDate)
    reservationDay.setUTCHours(0, 0, 0, 0)
    
    // If trying to book same day, it's invalid
    if (reservationDay.getTime() === today.getTime()) {
      return false
    }
  }
  
  const cutoffTime = getCutoffTime(res_type, reservationDate)
  return now < cutoffTime
}

function formatCutoffTime(cutoffTime: Date): string {
  return cutoffTime.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

function getCutoffDescription(res_type: ReservationType): string {
  return CUTOFF_RULES[res_type].description
}

// ---- Pool lane auto-assignment helpers (mirror create) ----
function timeToMinutes(t: string | null): number {
  if (!t) return -1;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function overlaps(aStart: string | null, aEnd: string | null, bStart: string | null, bEnd: string | null): boolean {
  const aS = timeToMinutes(aStart);
  const aE = timeToMinutes(aEnd);
  const bS = timeToMinutes(bStart);
  const bE = timeToMinutes(bEnd);
  if (aS < 0 || aE < 0 || bS < 0 || bE < 0) return false;
  return aS < bE && aE > bS;
}

// Compute how many contiguous lanes a reservation occupies
function poolSpanWidth(pool_type: string | null | undefined, student_count: number | null | undefined, totalLanes: number): number {
  if (pool_type === 'course_coaching') {
    const sc = typeof student_count === 'number' && Number.isFinite(student_count) ? student_count : 0
    const width = 1 + Math.max(0, sc)
    return Math.max(1, Math.min(width, totalLanes))
  }
  return 1
}

async function findAvailableLane(
  supabase: any,
  res_date_iso: string,
  start_time: string | null,
  end_time: string | null,
  excludeUid: string,
  requiredSpan: number,
  totalLanes: number = 8
): Promise<string | null> {
  // Fetch all pool reservations on the same calendar day, not just exact timestamp
  const date = new Date(res_date_iso)
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('res_pool')
    .select('uid, lane, start_time, end_time, res_date, pool_type, student_count')
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString());

  if (error) {
    console.error('Error fetching existing pool reservations:', error);
    return null;
  }

  const occupied: Set<string> = new Set();
  for (const row of data || []) {
    if (row.uid === excludeUid) continue;
    if (!row.lane) continue;
    if (!overlaps(row.start_time, row.end_time, start_time, end_time)) continue;
    const rowSpan = poolSpanWidth(row.pool_type as string | null, row.student_count as number | null, totalLanes);
    const startLaneNum = parseInt(String(row.lane), 10);
    if (!Number.isFinite(startLaneNum)) continue;
    for (let l = startLaneNum; l < startLaneNum + rowSpan && l <= totalLanes; l++) {
      occupied.add(String(l));
    }
  }

  // Find first contiguous block of requiredSpan free lanes
  const span = Math.max(1, Math.min(requiredSpan, totalLanes));
  for (let startLane = 1; startLane + span - 1 <= totalLanes; startLane++) {
    let free = true;
    for (let l = startLane; l < startLane + span; l++) {
      if (occupied.has(String(l))) { free = false; break; }
    }
    if (free) return String(startLane);
  }
  return null;
}

async function checkAvailability(supabase: any, date: string, res_type: ReservationType, category?: string): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    const { data, error } = await supabase
      .from('availabilities')
      .select('available, reason')
      .eq('date', date.split('T')[0]) // Extract date part
      .eq('res_type', res_type)
      .eq('category', category || null)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking availability:', error)
      return { isAvailable: false }
    }

    // If no row found, it's available by default
    if (!data) {
      return { isAvailable: true }
    }

    return {
      isAvailable: data.available,
      reason: data.reason || undefined
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    return { isAvailable: false }
  }
}

type ReservationStatus = 'pending' | 'confirmed' | 'rejected'

type UpdatePayload = {
  uid: string
  res_date: string
  parent?: { res_status?: ReservationStatus; res_date?: string }
  pool?: Record<string, unknown>
  classroom?: Record<string, unknown>
  openwater?: Record<string, unknown>
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req)
    if (pre) return pre

    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as UpdatePayload
    if (!body?.uid || !body?.res_date) return json({ error: 'Invalid payload' }, { status: 400 })

    // Get current reservation type for validation
    const { data: currentReservation, error: currentErr } = await supabase
      .from('reservations')
      .select('res_type')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single()
    
    if (currentErr) return json({ error: currentErr.message }, { status: 400 })
    
    const res_type = currentReservation.res_type as ReservationType
    const targetDate = body.parent?.res_date || body.res_date

    // Determine intent early
    const isApprovingRequest = body.parent?.res_status === 'confirmed'

    // Validate cut-off time if date is being changed
    if (body.parent?.res_date && !isBeforeCutoff(targetDate, res_type)) {
      const cutoffTime = getCutoffTime(res_type, targetDate);
      const cutoffDescription = getCutoffDescription(res_type);
      return json({ 
        error: `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}` 
      }, { status: 400 });
    }

    // Check availability if date is being changed
    if (body.parent?.res_date) {
      const availability = await checkAvailability(supabase, targetDate, res_type);
      if (!availability.isAvailable) {
        const reason = availability.reason ? ` (${availability.reason})` : '';
        return json({ 
          error: `This date is not available for reservations${reason}` 
        }, { status: 400 });
      }
    }

    // Owner or admin
    if (body.uid !== user.id) {
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('privileges')
        .eq('uid', user.id)
        .single()
      if (profileErr) return json({ error: profileErr.message }, { status: 403 })
      const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
      if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update parent if provided, but defer status=confirmed for pool/classroom until after auto-assign
    if (body.parent && (body.parent.res_status || body.parent.res_date)) {
      const parentUpdate: any = {}
      const isPoolOrClassroom = res_type === 'pool' || res_type === 'classroom'

      // Only set res_status here if not approving pool/classroom (we will set after successful auto-assign)
      if (body.parent.res_status && !(isApprovingRequest && isPoolOrClassroom)) {
        parentUpdate.res_status = body.parent.res_status
      }
      if (body.parent.res_date) parentUpdate.res_date = body.parent.res_date
      if (Object.keys(parentUpdate).length > 0) {
        parentUpdate.updated_at = new Date().toISOString()
        const { error: parentErr } = await supabase
          .from('reservations')
          .update(parentUpdate)
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
        if (parentErr) return json({ error: parentErr.message }, { status: 400 })
      }
    }

    // Determine current type to choose detail table
    const { data: cur, error: curErr } = await supabase
      .from('reservations')
      .select('res_type')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single()

    if (curErr) return json({ error: curErr.message }, { status: 404 })

    const isApproving = isApprovingRequest;

    if (cur.res_type === 'pool') {
      if (isApproving) {
        // On approval, auto-assign lane if missing
        const { data: poolRow, error: poolErr } = await supabase
          .from('res_pool')
          .select('lane, start_time, end_time, pool_type, student_count')
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
          .single();
        if (poolErr) return json({ error: poolErr.message }, { status: 400 });
        const hasLane = !!(poolRow?.lane && poolRow.lane !== '');
        if (!hasLane) {
          const requiredSpan = poolSpanWidth(poolRow?.pool_type ?? null, poolRow?.student_count as number | null, 8)
          const lane = await findAvailableLane(
            supabase,
            body.res_date,
            poolRow?.start_time ?? null,
            poolRow?.end_time ?? null,
            body.uid,
            requiredSpan,
            8
          );
          if (lane) {
            const { error } = await supabase
              .from('res_pool')
              .update({ lane })
              .eq('uid', body.uid)
              .eq('res_date', body.res_date);
            if (error) return json({ error: error.message }, { status: 400 });
          } else {
            return json({ error: MSG_NO_POOL_LANES }, { status: 400 });
          }
        }
        // Auto-assign succeeded or lane already present: now set parent status to confirmed
        const { error: parentErr2 } = await supabase
          .from('reservations')
          .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
        if (parentErr2) return json({ error: parentErr2.message }, { status: 400 })
      } else if (body.pool) {
        // Non-approval updates: do not auto-assign
        const { error } = await supabase.from('res_pool').update(body.pool).eq('uid', body.uid).eq('res_date', body.res_date)
        if (error) return json({ error: error.message }, { status: 400 })
      }
    } else if (cur.res_type === 'classroom') {
      if (isApproving) {
        // On approval, auto-assign room if missing
        const { data: classRow, error: classErr } = await supabase
          .from('res_classroom')
          .select('room, start_time, end_time')
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
          .single();
        if (classErr) return json({ error: classErr.message }, { status: 400 });
        const hasRoom = !!(classRow?.room && classRow.room !== '');
        if (!hasRoom) {
          const room = await findAvailableRoom(
            supabase,
            body.res_date,
            classRow?.start_time ?? null,
            classRow?.end_time ?? null,
            body.uid
          );
          if (room) {
            const { error } = await supabase
              .from('res_classroom')
              .update({ room })
              .eq('uid', body.uid)
              .eq('res_date', body.res_date);
            if (error) return json({ error: error.message }, { status: 400 });
          } else {
            return json({ error: MSG_NO_CLASSROOMS }, { status: 400 });
          }
        }
        // Auto-assign succeeded or room already present: now set parent status to confirmed
        const { error: parentErr2 } = await supabase
          .from('reservations')
          .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
        if (parentErr2) return json({ error: parentErr2.message }, { status: 400 })
      } else if (body.classroom) {
        // Non-approval updates: do not auto-assign
        const { error } = await supabase.from('res_classroom').update(body.classroom).eq('uid', body.uid).eq('res_date', body.res_date)
        if (error) return json({ error: error.message }, { status: 400 })
      }
    } else if (cur.res_type === 'open_water' && body.openwater) {
      const { error } = await supabase.from('res_openwater').update(body.openwater).eq('uid', body.uid).eq('res_date', body.res_date)
      if (error) return json({ error: error.message }, { status: 400 })
    }

    // If confirming open_water, trigger auto-assign buoy
    if (body.parent?.res_status === 'confirmed' && cur.res_type === 'open_water') {
      try {
        // Get the time period from the openwater details
        const { data: openwaterData } = await supabase
          .from('res_openwater')
          .select('time_period')
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
          .single();
        
        if (openwaterData?.time_period) {
          const r = await fetch(`${SUPABASE_URL}/functions/v1/auto-assign-buoy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify({ 
              res_date: new Date(body.res_date).toISOString().split('T')[0], 
              time_period: openwaterData.time_period 
            })
          })
          // Non-blocking; ignore failure
          await r.text()
        }
      } catch (_) {}
    }

    return json({ ok: true }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
