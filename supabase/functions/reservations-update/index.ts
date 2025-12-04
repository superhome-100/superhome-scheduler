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
  // Compute day boundaries
  const date = new Date(res_date_iso)
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  // Load classroom reservations via parent to filter status
  const from = dayStart.toISOString().replace('T', ' ').replace('Z', '+00')
  const to = dayEnd.toISOString().replace('T', ' ').replace('Z', '+00')
  const { data, error } = await supabase
    .from('reservations')
    .select('uid, res_status, res_classroom(room, start_time, end_time)')
    .eq('res_type', 'classroom')
    .in('res_status', ['pending', 'confirmed'])
    .gte('res_date', from)
    .lt('res_date', to)

  if (error) {
    console.error('Error fetching classroom reservations for occupancy:', error)
    return null
  }

  const occupied: Record<string, boolean> = {}
  for (const row of data || []) {
    if (!row || row.uid === excludeUid) continue
    const room = (row as any)?.res_classroom?.room as string | null
    const s = (row as any)?.res_classroom?.start_time as string | null
    const e = (row as any)?.res_classroom?.end_time as string | null
    if (room && overlaps(s, e, start_time, end_time)) {
      occupied[room] = true
    }
  }

  for (let room = 1; room <= 3; room++) {
    const key = String(room)
    if (!occupied[key]) return key
  }
  return null
}

type ReservationType = 'pool' | 'open_water' | 'classroom'

function getCutoffTime(res_type: ReservationType, reservationDate: string): Date {
  const resDate = new Date(reservationDate)
  
  if (res_type === 'open_water') {
    // 6 PM local time on the day before, computed via local date parts to avoid UTC skew
    const d = new Date(reservationDate)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    // Build local midnight of reservation day, then subtract 6 hours to get previous day 18:00
    const localMidnight = new Date(`${y}-${m}-${day}T00:00`)
    const cutoff = new Date(localMidnight)
    cutoff.setHours(18 - 24, 0, 0, 0) // previous day 18:00 local
    return cutoff
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
    today.setHours(0, 0, 0, 0)
    const reservationDay = new Date(resDate)
    reservationDay.setHours(0, 0, 0, 0)
    
    // If trying to book same day, it's invalid
    if (reservationDay.getTime() === today.getTime()) {
      return false
    }
  }
  
  const cutoffTime = getCutoffTime(res_type, reservationDate)
  return now < cutoffTime
}

// --- Legacy-aligned edit/cancel cutoff helpers (approximation without per-day settings) ---
function isBeforeModificationCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string | null
): boolean {
  const now = new Date()
  if (res_type === 'open_water') {
    // 6 PM previous day
    return now < getCutoffTime('open_water', reservationDateISO)
  }
  if (!startTime) return true
  const day = new Date(reservationDateISO)
  const dayISO = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  const start = new Date(`${dayISO}T${startTime}`)
  return now < start
}

function isBeforeCancelCutoff(
  res_type: ReservationType,
  reservationDateISO: string,
  startTime?: string | null
): boolean {
  const now = new Date()
  if (res_type === 'open_water') {
    // Same as modification cutoff for OW (previous day 18:00)
    return now < getCutoffTime('open_water', reservationDateISO)
  }
  if (!startTime) return true
  const day = new Date(reservationDateISO)
  const dayISO = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
  const start = new Date(`${dayISO}T${startTime}`)
  const cancelCut = new Date(start)
  cancelCut.setMinutes(cancelCut.getMinutes() - 60)
  return now < cancelCut
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
  // Fetch pool reservations for the day via parent to respect status
  // IMPORTANT: compute day bounds using date-only to avoid timezone skew
  const dateOnly = String(res_date_iso).split('T')[0]
  const from = `${dateOnly} 00:00:00+00`
  const to = `${dateOnly} 23:59:59+00`
  const { data, error } = await supabase
    .from('reservations')
    .select('uid, res_status, res_pool(lane, start_time, end_time, pool_type, student_count)')
    .eq('res_type', 'pool')
    .in('res_status', ['pending', 'confirmed'])
    .gte('res_date', from)
    .lt('res_date', to)

  if (error) {
    console.error('Error fetching pool reservations for occupancy:', error)
    return null
  }

  const occupied: Set<string> = new Set()
  for (const row of data || []) {
    if (!row || (row as any).uid === excludeUid) continue
    const rp = (row as any).res_pool
    if (!rp) continue
    const lane = rp.lane as string | null
    const s = rp.start_time as string | null
    const e = rp.end_time as string | null
    if (!lane) continue
    if (!overlaps(s, e, start_time, end_time)) continue
    const rowSpan = poolSpanWidth(rp.pool_type as string | null, rp.student_count as number | null, totalLanes)
    const startLaneNum = parseInt(String(lane), 10)
    if (!Number.isFinite(startLaneNum)) continue
    for (let l = startLaneNum; l < startLaneNum + rowSpan && l <= totalLanes; l++) {
      occupied.add(String(l))
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

async function checkAvailability(supabase: any, date: string, res_type: ReservationType, subtype?: string): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    let query = supabase
      .from('availabilities')
      .select('available, reason')
      .eq('date', date.split('T')[0]) // Extract date part
      .eq('category', res_type)
      .limit(1);

    // Handle nullable type correctly (use .is for NULL)
    if (subtype && subtype.length > 0) {
      query = query.eq('type', subtype);
    } else {
      // Only match rows where type IS NULL
      query = (query as any).is('type', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking availability:', error)
      return { isAvailable: false }
    }

    // If no row found, it's available by default
    if (!data || data.length === 0) {
      return { isAvailable: true }
    }

    const row = Array.isArray(data) ? data[0] : data
    return {
      isAvailable: !!row.available,
      reason: row.reason || undefined
    }
  } catch (error) {
    console.error('Error checking availability:', error)
    return { isAvailable: false }
  }
}

type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'

type UpdatePayload = {
  uid: string
  res_date: string
  parent?: { res_status?: ReservationStatus; res_date?: string; price?: number }
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    // Admin client (service role) for privileged writes AFTER we check ownership manually
    const admin = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null;

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as UpdatePayload
    console.log('[reservations-update] Incoming payload:', JSON.stringify(body))
    if (!body?.uid || !body?.res_date) return json({ error: 'Invalid payload: uid and res_date are required' }, { status: 400 })

    // Get current reservation type for validation
    const { data: currentReservation, error: currentErr } = await supabase
      .from('reservations')
      .select('res_type, res_status, reservation_id')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single()
    
    if (currentErr) {
      console.error('[reservations-update] Failed to load current reservation by uid/res_date:', currentErr)
      return json({ error: `Reservation not found for provided uid/res_date: ${currentErr.message}` }, { status: 400 })
    }
    
    const res_type = currentReservation.res_type as ReservationType
    const current_status = (currentReservation.res_status as ReservationStatus) || 'pending'
    // Determine the authoritative original child res_date from DB (avoids client mismatch)
    let childResDateOld: string | null = null;
    if (res_type === 'open_water') {
      const { data: childRow } = await supabase
        .from('res_openwater')
        .select('res_date')
        .eq('reservation_id', (currentReservation as any).reservation_id)
        .eq('uid', body.uid)
        .limit(1);
      childResDateOld = (childRow && childRow[0]?.res_date) || null;
    }
    const targetDate = body.parent?.res_date || (childResDateOld || body.res_date)
    // If parent.res_date is changing, subsequent detail ops should use the new date; otherwise the existing child date
    const detailResDateKey = body.parent?.res_date || (childResDateOld || body.res_date)
    const reservationId: number | null = (currentReservation as any)?.reservation_id ?? null

    // Derive category for availability check (subtype)
    async function getCurrentCategory(): Promise<string | null> {
      try {
        if (res_type === 'open_water') {
          if (body.openwater?.open_water_type && typeof body.openwater.open_water_type === 'string') return body.openwater.open_water_type as string
          const { data, error } = await supabase
            .from('res_openwater')
            .select('open_water_type')
            .eq('uid', body.uid)
            .eq('res_date', body.res_date)
            .single()
          if (!error) return (data?.open_water_type as string) || null
        } else if (res_type === 'pool') {
          if ((body.pool as any)?.pool_type && typeof (body.pool as any).pool_type === 'string') return (body.pool as any).pool_type as string
          const { data, error } = await supabase
            .from('res_pool')
            .select('pool_type')
            .eq('uid', body.uid)
            .eq('res_date', body.res_date)
            .single()
          if (!error) return (data?.pool_type as string) || null
        } else if (res_type === 'classroom') {
          if ((body.classroom as any)?.classroom_type && typeof (body.classroom as any).classroom_type === 'string') return (body.classroom as any).classroom_type as string
          const { data, error } = await supabase
            .from('res_classroom')
            .select('classroom_type')
            .eq('uid', body.uid)
            .eq('res_date', body.res_date)
            .single()
          if (!error) return (data?.classroom_type as string) || null
        }
      } catch (e) {
        console.warn('[reservations-update] getCurrentCategory failed:', e)
      }
      return null
    }
    const category = await getCurrentCategory()

    // Determine intent early
    const isApprovingRequest = body.parent?.res_status === 'confirmed'
    const isCancellingRequest = body.parent?.res_status === 'cancelled'

    // Handle cancellation early: enforce cutoff, clear lane/room, set status=cancelled
    if (isCancellingRequest) {
      // Load current detail to evaluate cutoff and know which table to clear
      let currentPool: { start_time: string | null } | null = null
      let currentClass: { start_time: string | null } | null = null
      if (res_type === 'pool') {
        const { data } = await supabase
          .from('res_pool')
          .select('start_time')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        currentPool = (data && data[0]) || null
      } else if (res_type === 'classroom') {
        const { data } = await supabase
          .from('res_classroom')
          .select('start_time')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        currentClass = (data && data[0]) || null
      }

      const startTimeForCutoff = res_type === 'pool' ? currentPool?.start_time : res_type === 'classroom' ? currentClass?.start_time : null
      if (!isBeforeCancelCutoff(res_type, detailResDateKey, startTimeForCutoff || undefined)) {
        return json({ error: 'The cancellation window for this reservation has expired.' }, { status: 400 })
      }

      // Clear assignment on details so capacity frees up
      if (res_type === 'pool') {
        await (admin || supabase)
          .from('res_pool')
          .update({ lane: null })
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
      } else if (res_type === 'classroom') {
        await (admin || supabase)
          .from('res_classroom')
          .update({ room: null })
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
      }

      // Set parent to cancelled
      const { error: cancelErr } = await (admin || supabase)
        .from('reservations')
        .update({ res_status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('uid', body.uid)
        .eq('res_date', detailResDateKey)
      if (cancelErr) return json({ error: cancelErr.message }, { status: 400 })
      return json({ ok: true, res_status: 'cancelled' }, { status: 200 })
    }

    // Validate cut-off time if date is being changed (general creation/submit rule)
    if (body.parent?.res_date && !isBeforeCutoff(targetDate, res_type)) {
      const cutoffTime = getCutoffTime(res_type, targetDate);
      const cutoffDescription = getCutoffDescription(res_type);
      return json({ 
        error: `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}` 
      }, { status: 400 });
    }

    // Check availability if date is being changed, EXCEPT for pending updates (non-approval)
    if (body.parent?.res_date) {
      const isPendingNonApproval = current_status === 'pending' && !isApprovingRequest
      if (!isPendingNonApproval) {
        const availability = await checkAvailability(supabase, targetDate, res_type, category || undefined);
        if (!availability.isAvailable) {
          const reason = availability.reason ? ` (${availability.reason})` : '';
          return json({ 
            error: `This date is not available for reservations${reason}` 
          }, { status: 400 });
        }
      } else {
        console.log('[reservations-update] Skipping availability check for pending edit')
      }
    }

    // Owner or admin
    if (body.uid !== user.id) {
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('privileges')
        .eq('uid', user.id)
        .single()
      if (profileErr) {
        console.error('[reservations-update] Failed to fetch privileges for non-owner:', profileErr)
        return json({ error: profileErr.message }, { status: 403 })
      }
      const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
      if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })
    }

    // If res_date is changing for Open Water, update child first (RLS ownership requires original key)
    let childUpdatedPreParent = false;
    if (res_type === 'open_water' && body.parent?.res_date) {
      try {
        const newDate = body.parent.res_date;
        const owRaw: any = body.openwater || {};
        // Update ONLY detail fields pre-parent to satisfy RLS WITH CHECK (ownership by old res_date)
        const normNoDate = {
          time_period: (() => {
            const v = (owRaw.time_period ?? '').toString().toUpperCase();
            if (v === 'AM' || v === 'PM') return v;
            if (v === 'MORNING') return 'AM';
            if (v === 'AFTERNOON' || v === 'EVENING') return 'PM';
            return undefined;
          })(),
          depth_m: owRaw.depth_m != null ? Number(owRaw.depth_m) : undefined,
          open_water_type: owRaw.open_water_type ?? undefined,
          pulley: owRaw.pulley != null ? Boolean(owRaw.pulley) : undefined,
          deep_fim_training: owRaw.deep_fim_training != null ? Boolean(owRaw.deep_fim_training) : undefined,
          bottom_plate: owRaw.bottom_plate != null ? Boolean(owRaw.bottom_plate) : undefined,
          large_buoy: owRaw.large_buoy != null ? Boolean(owRaw.large_buoy) : undefined,
          note: typeof owRaw.note === 'string' ? (owRaw.note || null) : undefined
        } as any;

        console.log('[reservations-update] Pre-parent update: updating res_openwater details by original key with', JSON.stringify(normNoDate));
        let { data: preUpd, error: preErr } = await supabase
          .from('res_openwater')
          .update(normNoDate)
          .eq('uid', body.uid)
          .eq('res_date', childResDateOld || body.res_date)
          .select('uid');
        if (preErr) {
          console.error('[reservations-update] Pre-parent openwater update failed:', preErr);
          return json({ error: preErr.message }, { status: 400 });
        }
        if (!preUpd || preUpd.length === 0) {
          console.warn('[reservations-update] Pre-parent openwater update matched 0 rows; retry by reservation_id');
          const { data: preUpd2, error: preErr2 } = await supabase
            .from('res_openwater')
            .update(normNoDate)
            .eq('reservation_id', (currentReservation as any).reservation_id)
            .eq('uid', body.uid)
            .select('uid');
          if (preErr2) return json({ error: preErr2.message }, { status: 400 });
          console.log('[reservations-update] Pre-parent openwater update rows (by reservation_id):', (preUpd2||[]).length);
        } else {
          console.log('[reservations-update] Pre-parent openwater update rows:', preUpd.length);
        }
        childUpdatedPreParent = true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[reservations-update] Pre-parent child update exception:', msg);
        return json({ error: msg }, { status: 400 });
      }
    }

    // Update parent if provided, but defer status=confirmed for pool/classroom until after auto-assign
    if (body.parent && (body.parent.res_status || body.parent.res_date || typeof body.parent.price === 'number')) {
      const parentUpdate: any = {}
      const isPoolOrClassroom = res_type === 'pool' || res_type === 'classroom'

      // Only set res_status here if not approving pool/classroom (we will set after successful auto-assign)
      if (body.parent.res_status && !(isApprovingRequest && isPoolOrClassroom)) {
        parentUpdate.res_status = body.parent.res_status
      }
      if (body.parent.res_date) parentUpdate.res_date = body.parent.res_date
      if (typeof body.parent.price === 'number') parentUpdate.price = body.parent.price
      if (Object.keys(parentUpdate).length > 0) {
        parentUpdate.updated_at = new Date().toISOString()
        const { error: parentErr } = await (admin || supabase)
          .from('reservations')
          .update(parentUpdate)
          .eq('uid', body.uid)
          .eq('res_date', body.res_date)
        if (parentErr) {
          console.error('[reservations-update] Parent update failed:', parentErr)
          return json({ error: parentErr.message }, { status: 400 })
        }
        // Keep detail tables in sync when res_date changes
        if (body.parent.res_date) {
          const newDate = body.parent.res_date
          try {
            if (res_type === 'pool') {
              // Prefer reservation_id to avoid timezone equality issues
              let rows = 0;
              if (reservationId != null) {
                const { data: updById, error: errById } = await (admin || supabase)
                  .from('res_pool')
                  .update({ res_date: newDate })
                  .eq('reservation_id', reservationId)
                  .eq('uid', body.uid)
                  .select('uid');
                if (errById) throw errById;
                rows = (updById || []).length;
              }
              if (rows === 0) {
                const { data: updByKey, error: errByKey } = await (admin || supabase)
                  .from('res_pool')
                  .update({ res_date: newDate })
                  .eq('uid', body.uid)
                  .eq('res_date', body.res_date)
                  .select('uid');
                if (errByKey) throw errByKey;
              }
            } else if (res_type === 'classroom') {
              // Prefer reservation_id first
              let rows = 0;
              if (reservationId != null) {
                const { data: updById, error: errById } = await (admin || supabase)
                  .from('res_classroom')
                  .update({ res_date: newDate })
                  .eq('reservation_id', reservationId)
                  .eq('uid', body.uid)
                  .select('uid');
                if (errById) throw errById;
                rows = (updById || []).length;
              }
              if (rows === 0) {
                const { data: updByKey, error: errByKey } = await (admin || supabase)
                  .from('res_classroom')
                  .update({ res_date: newDate })
                  .eq('uid', body.uid)
                  .eq('res_date', body.res_date)
                  .select('uid');
                if (errByKey) throw errByKey;
              }
            } else if (res_type === 'open_water') {
              // Prefer reservation_id first
              let rows = 0;
              if (reservationId != null) {
                const { data: updById, error: errById } = await (admin || supabase)
                  .from('res_openwater')
                  .update({ res_date: newDate })
                  .eq('reservation_id', reservationId)
                  .eq('uid', body.uid)
                  .select('uid');
                if (errById) throw errById;
                rows = (updById || []).length;
              }
              if (rows === 0) {
                const { data: updByKey, error: errByKey } = await (admin || supabase)
                  .from('res_openwater')
                  .update({ res_date: newDate })
                  .eq('uid', body.uid)
                  .eq('res_date', body.res_date)
                  .select('uid');
                if (errByKey) throw errByKey;
              }
            }
            console.log('[reservations-update] Synchronized detail res_date to', newDate)
          } catch (syncErr) {
            const msg = syncErr && (syncErr as any).message ? (syncErr as any).message : JSON.stringify(syncErr);
            console.error('[reservations-update] Failed to sync detail res_date:', msg)
            return json({ error: `Failed to sync detail res_date: ${msg}` }, { status: 400 })
          }
        }
      }
    }

    const isApproving = isApprovingRequest;

    if (res_type === 'pool') {
      // Load current detail to use for cutoff and comparisons
      let currentPool: { start_time: string | null; end_time: string | null; pool_type?: string | null; student_count?: number | null } | null = null
      try {
        const { data: cp } = await supabase
          .from('res_pool')
          .select('start_time, end_time, pool_type, student_count')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        currentPool = (cp && cp[0]) || null
      } catch {}
      const beforeMod = isBeforeModificationCutoff('pool', detailResDateKey, currentPool?.start_time || undefined)
      const beforeCancel = isBeforeCancelCutoff('pool', detailResDateKey, currentPool?.start_time || undefined)
      // If user is editing and we are before modification cutoff and time/date changed, clear lane assignment
      const requestedPool = body.pool as any
      if (!isApproving && requestedPool && beforeMod) {
        const timeChanged = (requestedPool.start_time && requestedPool.start_time !== currentPool?.start_time) || (requestedPool.end_time && requestedPool.end_time !== currentPool?.end_time)
        if (timeChanged || body.parent?.res_date) {
          await supabase.from('res_pool').update({ lane: null }).eq('uid', body.uid).eq('res_date', detailResDateKey)
        }
      }
      if (isApproving) {
        // On approval, auto-assign lane if missing
        const { data: poolRow, error: poolErr } = await supabase
          .from('res_pool')
          .select('lane, start_time, end_time, pool_type, student_count')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .single();
        if (poolErr) return json({ error: poolErr.message }, { status: 400 });
        const hasLane = !!(poolRow?.lane && poolRow.lane !== '');
        if (!hasLane) {
          const requiredSpan = poolSpanWidth(poolRow?.pool_type ?? null, poolRow?.student_count as number | null, 8)
          console.log('[reservations-update] Approve pool: seeking lane', {
            date: detailResDateKey,
            start: poolRow?.start_time,
            end: poolRow?.end_time,
            requiredSpan
          })
          const lane = await findAvailableLane(
            supabase,
            detailResDateKey,
            poolRow?.start_time ?? null,
            poolRow?.end_time ?? null,
            body.uid,
            requiredSpan,
            8
          );
          if (lane) {
            const { error } = await (admin || supabase)
              .from('res_pool')
              .update({ lane })
              .eq('uid', body.uid)
              .eq('res_date', detailResDateKey);
            if (error) return json({ error: error.message }, { status: 400 });
          } else {
            console.warn('[reservations-update] No pool lanes available for approval')
            return json({ error: MSG_NO_POOL_LANES }, { status: 400 });
          }
        }
        // Auto-assign succeeded or lane already present: now set parent status to confirmed
        const { error: parentErr2 } = await (admin || supabase)
          .from('reservations')
          .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
        if (parentErr2) return json({ error: parentErr2.message }, { status: 400 })
      } else if (body.pool) {
        // Enforce late-edit restriction window (after mod cutoff but before cancel cutoff)
        if (!beforeMod && beforeCancel) {
          const incoming = body.pool as any
          const orig = currentPool
          // Only allow: reduce student_count (if provided), change type from course -> autonomous, and update note
          const allowed: Record<string, any> = {}
          const keys = Object.keys(incoming)
          const isCourse = (orig?.pool_type || '').toString().includes('course')
          const loweringStudents = typeof incoming.student_count === 'number' && typeof orig?.student_count === 'number' && incoming.student_count < (orig?.student_count || 0)
          if (loweringStudents) allowed.student_count = incoming.student_count
          const typeChangeAllowed = isCourse && typeof incoming.pool_type === 'string' && incoming.pool_type.toString().includes('autonomous')
          if (typeChangeAllowed) allowed.pool_type = incoming.pool_type
          if (typeof incoming.note === 'string') allowed.note = incoming.note
          // Block any other changes in this window
          const attemptedOther = keys.filter(k => !Object.prototype.hasOwnProperty.call(allowed, k) && incoming[k] !== undefined)
          if (attemptedOther.length > 0) {
            return json({ error: 'Modification window has expired; only reducing students, switching to autonomous, or updating note are allowed.' }, { status: 400 })
          }
          body.pool = allowed
        }
        // Non-approval updates: do not auto-assign
        let { data: upd, error } = await supabase.from('res_pool').update(body.pool).eq('uid', body.uid).eq('res_date', detailResDateKey).select('uid')
        if (error) {
          console.error('[reservations-update] Pool details update failed:', error)
          return json({ error: error.message }, { status: 400 })
        }
        if (!upd || upd.length === 0) {
          console.warn('[reservations-update] Pool update matched 0 rows using new key, retrying with original res_date')
          const { data: upd2, error: err2 } = await supabase.from('res_pool').update(body.pool).eq('uid', body.uid).eq('res_date', body.res_date).select('uid')
          if (err2) return json({ error: err2.message }, { status: 400 })
          console.log('[reservations-update] Pool update rows (fallback):', (upd2||[]).length)
        } else {
          console.log('[reservations-update] Pool update rows:', upd.length)
        }
      }
    } else if (res_type === 'classroom') {
      // Load current classroom detail to use for cutoff and comparisons
      let currentClass: { start_time: string | null; end_time: string | null; classroom_type?: string | null; student_count?: number | null } | null = null
      try {
        const { data: cc } = await supabase
          .from('res_classroom')
          .select('start_time, end_time, classroom_type, student_count')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        currentClass = (cc && cc[0]) || null
      } catch {}
      const beforeMod = isBeforeModificationCutoff('classroom', detailResDateKey, currentClass?.start_time || undefined)
      const beforeCancel = isBeforeCancelCutoff('classroom', detailResDateKey, currentClass?.start_time || undefined)
      const requestedClass = body.classroom as any
      if (!isApproving && requestedClass && beforeMod) {
        const timeChanged = (requestedClass.start_time && requestedClass.start_time !== currentClass?.start_time) || (requestedClass.end_time && requestedClass.end_time !== currentClass?.end_time)
        if (timeChanged || body.parent?.res_date) {
          await supabase.from('res_classroom').update({ room: null }).eq('uid', body.uid).eq('res_date', detailResDateKey)
        }
      }
      if (isApproving) {
        // On approval, auto-assign room if missing
        const { data: classRow, error: classErr } = await supabase
          .from('res_classroom')
          .select('room, start_time, end_time')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .single();
        if (classErr) return json({ error: classErr.message }, { status: 400 });
        const hasRoom = !!(classRow?.room && classRow.room !== '');
        if (!hasRoom) {
          const room = await findAvailableRoom(
            supabase,
            detailResDateKey,
            classRow?.start_time ?? null,
            classRow?.end_time ?? null,
            body.uid
          );
          if (room) {
            const { error } = await (admin || supabase)
              .from('res_classroom')
              .update({ room })
              .eq('uid', body.uid)
              .eq('res_date', detailResDateKey);
            if (error) return json({ error: error.message }, { status: 400 });
          } else {
            console.warn('[reservations-update] No classrooms available for approval')
            return json({ error: MSG_NO_CLASSROOMS }, { status: 400 });
          }
        }
        // Auto-assign succeeded or room already present: now set parent status to confirmed
        const { error: parentErr2 } = await (admin || supabase)
          .from('reservations')
          .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
        if (parentErr2) return json({ error: parentErr2.message }, { status: 400 })
      } else if (body.classroom) {
        if (!beforeMod && beforeCancel) {
          const incoming = body.classroom as any
          const orig = currentClass
          const allowed: Record<string, any> = {}
          const keys = Object.keys(incoming)
          const loweringStudents = typeof incoming.student_count === 'number' && typeof orig?.student_count === 'number' && incoming.student_count < (orig?.student_count || 0)
          if (loweringStudents) allowed.student_count = incoming.student_count
          if (typeof incoming.note === 'string') allowed.note = incoming.note
          const attemptedOther = keys.filter(k => !Object.prototype.hasOwnProperty.call(allowed, k) && incoming[k] !== undefined)
          if (attemptedOther.length > 0) {
            return json({ error: 'Modification window has expired; only reducing students or updating note are allowed.' }, { status: 400 })
          }
          body.classroom = allowed
        }
        // Non-approval updates: do not auto-assign
        let { data: upd, error } = await supabase.from('res_classroom').update(body.classroom).eq('uid', body.uid).eq('res_date', detailResDateKey).select('uid')
        if (error) {
          console.error('[reservations-update] Classroom details update failed:', error)
          return json({ error: error.message }, { status: 400 })
        }
        if (!upd || upd.length === 0) {
          console.warn('[reservations-update] Classroom update matched 0 rows using new key, retrying with original res_date')
          const { data: upd2, error: err2 } = await supabase.from('res_classroom').update(body.classroom).eq('uid', body.uid).eq('res_date', body.res_date).select('uid')
          if (err2) return json({ error: err2.message }, { status: 400 })
          console.log('[reservations-update] Classroom update rows (fallback):', (upd2||[]).length)
        } else {
          console.log('[reservations-update] Classroom update rows:', upd.length)
        }
      }
    } else if (res_type === 'open_water' && body.openwater && !childUpdatedPreParent) {
      const beforeMod = isBeforeModificationCutoff('open_water', detailResDateKey)
      const beforeCancel = isBeforeCancelCutoff('open_water', detailResDateKey)
      // Normalize payload to match DB types
      const owRaw: any = body.openwater || {}
      let norm = {
        time_period: (() => {
          const v = (owRaw.time_period ?? '').toString().toUpperCase()
          if (v === 'AM' || v === 'PM') return v
          if (v === 'MORNING') return 'AM'
          if (v === 'AFTERNOON' || v === 'EVENING') return 'PM'
          return undefined
        })(),
        depth_m: owRaw.depth_m != null ? Number(owRaw.depth_m) : undefined,
        open_water_type: owRaw.open_water_type ?? undefined,
        pulley: owRaw.pulley != null ? Boolean(owRaw.pulley) : undefined,
        deep_fim_training: owRaw.deep_fim_training != null ? Boolean(owRaw.deep_fim_training) : undefined,
        bottom_plate: owRaw.bottom_plate != null ? Boolean(owRaw.bottom_plate) : undefined,
        large_buoy: owRaw.large_buoy != null ? Boolean(owRaw.large_buoy) : undefined,
        note: typeof owRaw.note === 'string' ? (owRaw.note || null) : undefined
      }
      // Late-edit window for Open Water: block time period/type changes; allow safety/note/depth
      if (!beforeMod && beforeCancel) {
        norm = {
          depth_m: norm.depth_m,
          pulley: norm.pulley,
          deep_fim_training: norm.deep_fim_training,
          bottom_plate: norm.bottom_plate,
          large_buoy: norm.large_buoy,
          note: norm.note
        } as any
      }
      // Debug: show current row before update
      try {
        const { data: before } = await supabase
          .from('res_openwater')
          .select('time_period, depth_m, open_water_type, pulley, deep_fim_training, bottom_plate, large_buoy, note, res_date, reservation_id')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        console.log('[reservations-update] Open water BEFORE (by new key):', before && before[0])
      } catch {}

      console.log('[reservations-update] Updating res_openwater with', JSON.stringify(norm), 'key', detailResDateKey)
      let { data: upd, error } = await supabase.from('res_openwater').update(norm).eq('uid', body.uid).eq('res_date', detailResDateKey).select('uid')
      if (error) {
        console.error('[reservations-update] Open water details update failed:', error)
        return json({ error: error.message }, { status: 400 })
      }
      if (!upd || upd.length === 0) {
        console.warn('[reservations-update] Open water update matched 0 rows using new key, retrying with original res_date')
        const { data: upd2, error: err2 } = await supabase.from('res_openwater').update(norm).eq('uid', body.uid).eq('res_date', childResDateOld || body.res_date).select('uid')
        if (err2) return json({ error: err2.message }, { status: 400 })
        console.log('[reservations-update] Open water update rows (fallback by old key):', (upd2||[]).length)
        if ((!upd2 || upd2.length === 0) && reservationId != null) {
          console.warn('[reservations-update] Open water update still 0 rows; retrying by reservation_id', reservationId)
          const { data: upd3, error: err3 } = await supabase.from('res_openwater').update(norm).eq('reservation_id', reservationId).eq('uid', body.uid).select('uid')
          if (err3) return json({ error: err3.message }, { status: 400 })
          console.log('[reservations-update] Open water update rows (by reservation_id):', (upd3||[]).length)
        }
      } else {
        console.log('[reservations-update] Open water update rows:', upd.length)
      }
      // Debug: show current row after update (by reservation_id if available, else by new key)
      try {
        if (reservationId != null) {
          const { data: after } = await supabase
            .from('res_openwater')
            .select('time_period, depth_m, open_water_type, pulley, deep_fim_training, bottom_plate, large_buoy, note, res_date, reservation_id')
            .eq('reservation_id', reservationId)
            .limit(1)
          console.log('[reservations-update] Open water AFTER (by reservation_id):', after && after[0])
        } else {
          const { data: after2 } = await supabase
            .from('res_openwater')
            .select('time_period, depth_m, open_water_type, pulley, deep_fim_training, bottom_plate, large_buoy, note, res_date, reservation_id')
            .eq('uid', body.uid)
            .eq('res_date', detailResDateKey)
            .limit(1)
          console.log('[reservations-update] Open water AFTER (by new key):', after2 && after2[0])
        }
      } catch {}
    }

    // Note: Auto-assign buoy is now handled by the assignment queue + database trigger
    // No need to explicitly call it here

    // Build response with effective key and (optional) updated child snapshot
    const response: any = { ok: true, effective_res_date: detailResDateKey }
    try {
      if (res_type === 'open_water') {
        const { data: ow } = await supabase
          .from('res_openwater')
          .select('time_period, depth_m, open_water_type, pulley, deep_fim_training, bottom_plate, large_buoy, note')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        response.openwater = ow && ow[0] ? ow[0] : undefined
      } else if (res_type === 'pool') {
        const { data: pl } = await supabase
          .from('res_pool')
          .select('start_time, end_time, pool_type, student_count, note, lane')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        response.pool = pl && pl[0] ? pl[0] : undefined
      } else if (res_type === 'classroom') {
        const { data: cl } = await supabase
          .from('res_classroom')
          .select('start_time, end_time, classroom_type, student_count, note, room')
          .eq('uid', body.uid)
          .eq('res_date', detailResDateKey)
          .limit(1)
        response.classroom = cl && cl[0] ? cl[0] : undefined
      }
    } catch {}
    return json(response, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[reservations-update] Uncaught error:', message)
    return json({ error: message }, { status: 500 })
  }
})
