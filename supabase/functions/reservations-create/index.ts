// Supabase Edge Function: reservations-create
// - Owner or admin can create reservations
// - Creates parent reservation and type-specific detail; rolls back on failure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'
import { findAvailablePoolLane } from '../_shared/poolLane.ts'
import { checkPoolLaneCollision } from '../_shared/poolCollision.ts'

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

function overlaps(s1: string | null, e1: string | null, s2: string | null, e2: string | null): boolean {
  if (!s1 || !e1 || !s2 || !e2) return false;
  return s1 < e2 && e1 > s2;
}

async function findAvailableRoom(
  supabase: any,
  res_date_iso: string,
  start_time: string | null,
  end_time: string | null
): Promise<string | null> {
  // Query all classroom reservations for the same calendar day
  const date = new Date(res_date_iso)
  const dayStart = new Date(date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('res_classroom')
    .select('room, start_time, end_time')
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString());

  if (error) {
    console.error('Error fetching existing classroom reservations:', error);
    return null;
  }

  const occupiedByRoom: Record<string, boolean> = {};
  for (const row of data || []) {
    if (row.room && overlaps(row.start_time, row.end_time, start_time, end_time)) {
      occupiedByRoom[row.room] = true;
    }
  }

  for (let room = 1; room <= 3; room++) {
    const key = String(room);
    if (!occupiedByRoom[key]) return key;
  }
  return null;
}

// Pool lane auto-assignment helpers are shared in _shared/poolLane.ts

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

async function checkAvailability(
  supabase: any,
  date: string,
  res_type: ReservationType,
  subtype: string | null | undefined
): Promise<{ isAvailable: boolean; reason?: string }> {
  try {
    const dateOnly = date.split('T')[0];
    const { data, error } = await supabase
      .from('availabilities')
      .select('available, reason, type')
      .eq('date', dateOnly)
      .eq('category', res_type);

    if (error) {
      console.error('Error checking availability:', error);
      return { isAvailable: false };
    }

    if (!data || data.length === 0) {
      // No overrides: available by default
      return { isAvailable: true };
    }

    // Prefer specific subtype override, fall back to generic (type IS NULL or empty string)
    const specific = subtype ? data.find((row: any) => row.type === subtype) : null;
    const generic = data.find((row: any) => row.type === null || row.type === '');
    const override = specific ?? generic;

    if (!override) {
      // No applicable override -> available by default
      return { isAvailable: true };
    }

    return {
      isAvailable: override.available,
      reason: override.reason || undefined
    };
  } catch (error) {
    console.error('Error checking availability:', error);
    return { isAvailable: false };
  }
}

type ReservationType = 'pool' | 'open_water' | 'classroom'

type PoolDetails = { start_time: string | null; end_time: string | null; lane?: string | null; pool_type?: string | null; student_count?: number | null; note?: string | null }
 type ClassroomDetails = { start_time: string | null; end_time: string | null; room?: string | null; classroom_type?: string | null; student_count?: number | null; note?: string | null }
 type OpenWaterDetails = { time_period: string | null; depth_m?: number | null; buoy?: string | null; auto_adjust_closest?: boolean; pulley?: boolean; deep_fim_training?: boolean; bottom_plate?: boolean; large_buoy?: boolean; open_water_type?: string | null; student_count?: number | null; group_id?: number | null; note?: string | null }

interface Payload {
  uid: string
  res_type: ReservationType
  res_date: string // ISO or YYYY-MM-DD
  res_status?: 'pending' | 'confirmed' | 'rejected'
  pool?: PoolDetails
  classroom?: ClassroomDetails
  openwater?: OpenWaterDetails
  buddies?: string[] // Array of buddy UIDs
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

// CORS is now shared via `supabase/functions/_shared/cors.ts`


Deno.serve(async (req: Request) => {
  try {
    // Preflight per guide (shared helper)
    const pre = handlePreflight(req)
    if (pre) return pre

    const debugPoolCollision = (() => {
      const header = req.headers.get('x-debug-pool-collision')
      if (header && String(header).trim() !== '' && String(header).trim() !== '0') return true
      const env = Deno.env.get('POOL_COLLISION_DEBUG')
      return env === '1' || String(env || '').toLowerCase() === 'true'
    })()

    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Server not configured' }, { status: 500 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as Payload;
    if (!body?.uid || !body?.res_type || !body?.res_date) return json({ error: 'Invalid payload' }, { status: 400 });

    // Validate cut-off time
    // Extract start time / time period for accurate cutoff check
    let startTimeForCutoff: string | null = null;
    let timePeriodForCutoff: string | null = null;

    if (body.res_type === 'pool') startTimeForCutoff = body.pool?.start_time || null;
    else if (body.res_type === 'classroom') startTimeForCutoff = body.classroom?.start_time || null;
    else if (body.res_type === 'open_water') timePeriodForCutoff = body.openwater?.time_period || null;

    const isBeforeCreationCutoff = (resDate: string, resType: ReservationType, sTime: string | null, tPeriod: string | null) => {
      const now = new Date();
      if (resType === 'open_water') {
        const d = new Date(resDate);
        // Check same day first
        const today = new Date(now);
        today.setUTCHours(0,0,0,0);
        const rDay = new Date(d);
        rDay.setUTCHours(0,0,0,0);
        if (rDay.getTime() === today.getTime()) return false;

        // Check 6 PM previous day
        // Approximate: if we are at/after 6 PM previous day locally...
        // Use getCutoffTime logic which seems to handle the 6 PM rule
        return now < getCutoffTime(resType, resDate);
      }
      
      // Pool/Classroom: 30 mins before start
      if (!sTime) return isBeforeCutoff(resDate, resType); // Fallback if no start time provided (though required later)
      
      const day = new Date(resDate);
      const dayISO = day.toISOString().split('T')[0];
      const startDt = new Date(`${dayISO}T${sTime}`);
      const cutoff = new Date(startDt);
      cutoff.setMinutes(cutoff.getMinutes() - 30);
      return now < cutoff;
    };

    if (!isBeforeCreationCutoff(body.res_date, body.res_type, startTimeForCutoff, timePeriodForCutoff)) {
      // Calculate display time for error message
      let cutoffTime: Date;
      if (body.res_type === 'open_water') {
         cutoffTime = getCutoffTime(body.res_type, body.res_date);
      } else if (startTimeForCutoff) {
         const d = new Date(body.res_date).toISOString().split('T')[0];
         const dt = new Date(`${d}T${startTimeForCutoff}`);
         cutoffTime = new Date(dt);
         cutoffTime.setMinutes(cutoffTime.getMinutes() - 30);
      } else {
         cutoffTime = getCutoffTime(body.res_type, body.res_date);
      }

      const cutoffDescription = getCutoffDescription(body.res_type);
      return json({ 
        error: `${cutoffDescription}. Cut-off time was ${formatCutoffTime(cutoffTime)}` 
      }, { status: 400 });
    }

    // Determine subtype for availability checks based on reservation type
    let subtype: string | null | undefined = null;
    if (body.res_type === 'pool') {
      subtype = body.pool?.pool_type ?? null;
    } else if (body.res_type === 'classroom') {
      subtype = body.classroom?.classroom_type ?? null;
    } else if (body.res_type === 'open_water') {
      subtype = body.openwater?.open_water_type ?? null;
    }

    // Check availability (category = res_type, type = subtype or null)
    const availability = await checkAvailability(supabase, body.res_date, body.res_type, subtype);
    if (!availability.isAvailable) {
      const reason = availability.reason ? ` (${availability.reason})` : '';
      return json({ 
        error: `This date is not available for reservations${reason}` 
      }, { status: 400 });
    }

    // Open Water Autonomous Platform group-size rule:
    // require at least 2 buddies (owner + 2 buddies = min group of 3),
    // mirroring legacy behavior for autonomousPlatform and autonomousPlatformCBS.
    if (body.res_type === 'open_water') {
      const owType = body.openwater?.open_water_type || null;
      if (owType === 'autonomous_platform' || owType === 'autonomous_platform_cbs') {
        const buddies: unknown = body.buddies;
        const buddyList = Array.isArray(buddies) ? buddies : [];
        if (buddyList.length < 2) {
          return json({
            error: 'Booking this training type requires a minimum of 2 buddies.'
          }, { status: 400 });
        }
      }
    }

    // Pool Autonomous buddy cap: at most 1 buddy allowed
    if (body.res_type === 'pool') {
      const poolType = body.pool?.pool_type || null;
      if (poolType === 'autonomous') {
        const buddies: unknown = body.buddies;
        const buddyCount = Array.isArray(buddies) ? buddies.length : 0;
        if (buddyCount > 1) {
          return json({ error: 'Pool Autonomous allows at most 1 buddy.' }, { status: 400 });
        }
      }
    }

    // Classroom capacity check (authoritative): block creation when no room available for selected time
    if (body.res_type === 'classroom') {
      const s = body.classroom?.start_time ?? null;
      const e = body.classroom?.end_time ?? null;
      if (!s || !e) {
        return json({ error: 'Start and end time are required for classroom reservations' }, { status: 400 });
      }
      const toMin = (raw: string | null) => {
        if (!raw) return NaN;
        const m = String(raw).match(/^(\d{2}):(\d{2})/);
        if (!m) return NaN;
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      };
      const sUser = toMin(s);
      const eUser = toMin(e);
      const dateOnly = String(body.res_date).split('T')[0];
      const from = `${dateOnly} 00:00:00+00`;
      const to = `${dateOnly} 23:59:59+00`;
      const { data: overlaps, error: overErr } = await supabase
        .from('reservations')
        .select('res_status, res_classroom(start_time, end_time)')
        .eq('res_type', 'classroom')
        .gte('res_date', from)
        .lte('res_date', to)
        .in('res_status', ['pending', 'confirmed']);
      if (overErr) {
        return json({ error: overErr.message }, { status: 400 });
      }
      const overlapsCount = (overlaps || []).reduce((acc: number, r: any) => {
        const sDb = toMin(r?.res_classroom?.start_time ?? null);
        const eDb = toMin(r?.res_classroom?.end_time ?? null);
        if (Number.isNaN(sDb) || Number.isNaN(eDb) || Number.isNaN(sUser) || Number.isNaN(eUser)) return acc;
        return sDb < eUser && eDb > sUser ? acc + 1 : acc;
      }, 0);
      const CAPACITY = 3; // TODO: replace with settings-backed capacity
      if (overlapsCount >= CAPACITY) {
        return json({ error: 'No classrooms available for the selected time window' }, { status: 409 });
      }
    }

    // Pool capacity check (authoritative): block creation when no lane available for selected time
    if (body.res_type === 'pool') {
      const s = body.pool?.start_time ?? null;
      const e = body.pool?.end_time ?? null;
      if (!s || !e) {
        return json({ error: 'Start and end time are required for pool reservations' }, { status: 400 });
      }
      const dateOnly = String(body.res_date).split('T')[0];

      // If a lane was explicitly selected, verify it doesn't collide with any existing
      // pending/confirmed pool reservations (including multi-lane span for course/coaching).
      const explicitLane = (body.pool as any)?.lane != null ? String((body.pool as any).lane) : null;
      if (explicitLane) {
        const { collision, blockedLanes } = await checkPoolLaneCollision(
          { supabase: serviceSupabase },
          {
            resDateIso: body.res_date,
            startTime: s,
            endTime: e,
            lane: explicitLane,
            poolType: body.pool.pool_type ?? null,
            studentCount: body.pool.student_count ?? null,
            totalLanes: 8,
            debug: debugPoolCollision,
          },
        );
        if (collision) {
          const blocked = Array.isArray(blockedLanes) && blockedLanes.length
            ? ` Blocked lane(s): ${blockedLanes.join(', ')}.`
            : '';
          return json({
            error: 'collision',
            message: `Selected pool lane is no longer available for the selected time.${blocked}`
          }, { status: 409 });
        }
      } else {
        // No explicit lane: ensure at least one contiguous lane block exists for the requested span.
        const lane = await findAvailablePoolLane(
          { supabase: serviceSupabase },
          {
            resDateIso: body.res_date,
            startTime: s,
            endTime: e,
            poolType: body.pool.pool_type ?? null,
            studentCount: body.pool.student_count ?? null,
            totalLanes: 8,
          },
        );
        if (!lane) {
          return json({
            error: 'no_pool_lanes',
            message: 'No pool lanes available for the selected time'
          }, { status: 409 });
        }
        // Persist the simulated/selected lane so subsequent inserts cannot proceed without it.
        ;(body.pool as any).lane = lane

        // Optional deep debug: emit cell logs for the chosen lane so you can inspect
        // existing cells, incoming cells, and overlaps for the final assignment.
        if (debugPoolCollision) {
          try {
            await checkPoolLaneCollision(
              { supabase: serviceSupabase },
              {
                resDateIso: body.res_date,
                startTime: s,
                endTime: e,
                lane,
                poolType: body.pool.pool_type ?? null,
                studentCount: body.pool.student_count ?? null,
                totalLanes: 8,
                debug: true,
              },
            )
          } catch (e) {
            console.warn('[reservations-create][pool][collision][debug] failed to emit cell logs:', e)
          }
        }
      }
    }

    // Same-type duplicate check: prevent creating a reservation if the user already
    // has one for the same type and time on the same date.
    {
      const dateOnly = String(body.res_date).split('T')[0];
      const from = `${dateOnly} 00:00:00+00`;
      const to = `${dateOnly} 23:59:59+00`;

      // Determine start time key for the incoming reservation
      let candidateTime: string | null = null;
      const normalizeTime = (raw: string | null | undefined): string | null => {
        if (!raw) return null;
        const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        const hh = m[1].padStart(2, '0');
        const mm = m[2];
        return `${hh}:${mm}`;
      };
      if (body.res_type === 'open_water') {
        const tp = (body.openwater?.time_period || 'AM').toUpperCase();
        candidateTime = tp === 'PM' ? '13:00' : '08:00';
      } else if (body.res_type === 'pool') {
        candidateTime = normalizeTime(body.pool?.start_time);
      } else if (body.res_type === 'classroom') {
        candidateTime = normalizeTime(body.classroom?.start_time);
      }

      if (!candidateTime) {
        return json({ error: 'Missing start time for duplicate check' }, { status: 400 });
      }

      // Fetch same-type reservations by the same user on the same day
      const { data: sameType, error: sameErr } = await serviceSupabase
        .from('reservations')
        .select(`
          res_type,
          res_openwater(time_period, open_water_type),
          res_pool(start_time, pool_type),
          res_classroom(start_time, classroom_type)
        `)
        .eq('uid', body.uid)
        .eq('res_type', body.res_type)
        .in('res_status', ['pending', 'confirmed'])
        .gte('res_date', from)
        .lte('res_date', to);

      if (sameErr) {
        return json({ error: sameErr.message }, { status: 400 });
      }

      const timeOf = (r: any): string | null => {
        if (r.res_type === 'open_water') {
          const tp = (r?.res_openwater?.time_period || 'AM').toUpperCase();
          return tp === 'PM' ? '13:00' : '08:00';
        }
        if (r.res_type === 'pool') return normalizeTime(r?.res_pool?.start_time ?? null);
        if (r.res_type === 'classroom') return normalizeTime(r?.res_classroom?.start_time ?? null);
        return null;
      };

      const duplicate = (sameType || []).find((r: any) => {
        const t = timeOf(r);
        return !!t && t === candidateTime;
      });

      if (duplicate) {
        const pretty = (s: string | null | undefined) => {
          if (!s) return null;
          const x = String(s).toLowerCase();
          if (x === 'course_coaching') return 'Course/Coaching';
          return x.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
        };
        const category = duplicate.res_type === 'open_water' ? 'Open Water' : (duplicate.res_type === 'pool' ? 'Pool' : (duplicate.res_type === 'classroom' ? 'Classroom' : 'Reservation'));
        const subtype = duplicate.res_type === 'open_water' ? pretty(duplicate?.res_openwater?.open_water_type) : (duplicate.res_type === 'pool' ? pretty(duplicate?.res_pool?.pool_type) : (duplicate.res_type === 'classroom' ? pretty(duplicate?.res_classroom?.classroom_type) : null));
        const typeLabel = subtype ? `${category} ${subtype}` : category;

        const dateObj = new Date(body.res_date);
        const datePart = dateObj.toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        // For Open Water, show AM/PM period instead of numeric time
        let timeLabel: string;
        if (duplicate.res_type === 'open_water') {
          const tp = (duplicate?.res_openwater?.time_period || 'AM').toUpperCase();
          timeLabel = tp === 'PM' ? 'PM' : 'AM';
        } else {
          // Pure HH:mm -> 12-hour conversion without timezone shifting
          const [h, m] = candidateTime.split(':').map((n) => parseInt(n, 10));
          const h12 = ((h + 11) % 12) + 1;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const mm = String(m).padStart(2, '0');
          timeLabel = `${h12}:${mm} ${ampm}`;
        }

        // Use 400 as requested for duplicate same-type, structured JSON
        return json({
          error: 'duplicate',
          message: `Already have a reservation for ${typeLabel} on ${datePart} at ${timeLabel}.`
        }, { status: 400 });
      }
    }

    // Cross-type conflict check: block if user already has a reservation of a different type
    // at the same date and time (open water uses fixed slot times: 08:00 AM / 01:00 PM)
    {
      const dateOnly = String(body.res_date).split('T')[0];
      const from = `${dateOnly} 00:00:00+00`;
      const to = `${dateOnly} 23:59:59+00`;

      // Determine the candidate "start time" string for the new reservation
      const normalizeTime = (raw: string | null | undefined): string | null => {
        if (!raw) return null;
        const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
        if (!m) return null;
        const hh = m[1].padStart(2, '0');
        const mm = m[2];
        return `${hh}:${mm}`;
      };
      let candidateTime: string | null = null;
      if (body.res_type === 'open_water') {
        const tp = (body.openwater?.time_period || 'AM').toUpperCase();
        candidateTime = tp === 'PM' ? '13:00' : '08:00';
      } else if (body.res_type === 'pool') {
        candidateTime = normalizeTime(body.pool?.start_time);
      } else if (body.res_type === 'classroom') {
        candidateTime = normalizeTime(body.classroom?.start_time);
      }

      if (!candidateTime) {
        return json({ error: 'Missing start time for conflict check' }, { status: 400 });
      }

      // Fetch reservations of other types for same user and same day
      const { data: existing, error: existErr } = await serviceSupabase
        .from('reservations')
        .select(`
          res_type,
          res_openwater(time_period, open_water_type),
          res_pool(start_time, pool_type),
          res_classroom(start_time, classroom_type)
        `)
        .eq('uid', body.uid)
        .neq('res_type', body.res_type)
        .in('res_status', ['pending', 'confirmed'])
        .gte('res_date', from)
        .lte('res_date', to);

      if (existErr) {
        return json({ error: existErr.message }, { status: 400 });
      }

      // Helper to compute the comparable time string for an existing reservation
      const timeOf = (r: any): string | null => {
        if (r.res_type === 'open_water') {
          const tp = (r?.res_openwater?.time_period || 'AM').toUpperCase();
          return tp === 'PM' ? '13:00' : '08:00';
        }
        if (r.res_type === 'pool') return normalizeTime(r?.res_pool?.start_time ?? null);
        if (r.res_type === 'classroom') return normalizeTime(r?.res_classroom?.start_time ?? null);
        return null;
      };

      const found = (existing || []).find((r: any) => {
        const t = timeOf(r);
        return !!t && t === candidateTime;
      });

      if (found) {
        // Build human-readable type label and time string
        const pretty = (s: string | null | undefined) => {
          if (!s) return null;
          const x = String(s).toLowerCase();
          if (x === 'course_coaching') return 'Course/Coaching';
          return x.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
        };
        const category = found.res_type === 'open_water' ? 'Open Water' : (found.res_type === 'pool' ? 'Pool' : (found.res_type === 'classroom' ? 'Classroom' : 'Reservation'));
        const subtype = found.res_type === 'open_water' ? pretty(found?.res_openwater?.open_water_type) : (found.res_type === 'pool' ? pretty(found?.res_pool?.pool_type) : (found.res_type === 'classroom' ? pretty(found?.res_classroom?.classroom_type) : null));
        const typeLabel = subtype ? `${category} ${subtype}` : category;

        const dateObj = new Date(body.res_date);
        const datePart = dateObj.toLocaleString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });
        // Format time based on reservation type
        let timeLabel: string;
        if (found.res_type === 'open_water') {
          const tp = (found?.res_openwater?.time_period || 'AM').toUpperCase();
          timeLabel = tp === 'PM' ? 'PM' : 'AM';
        } else {
          // Pure HH:mm -> 12-hour conversion without timezone shifting
          const [h, m] = candidateTime.split(':').map((n) => parseInt(n, 10));
          const h12 = ((h + 11) % 12) + 1;
          const ampm = h >= 12 ? 'PM' : 'AM';
          const mm = String(m).padStart(2, '0');
          timeLabel = `${h12}:${mm} ${ampm}`;
        }

        return json({
          error: 'conflict',
          message: `Already have a reservation for ${typeLabel} on ${datePart} at ${timeLabel}.`
        }, { status: 409 });
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

    // Ensure user profile exists (FK on reservations.uid references user_profiles.uid)
    // - If owner (uid === auth user), create their profile if missing.
    // - If admin creating for someone else, require profile to already exist (RLS forbids inserting others).
    {
      const { data: targetProfile, error: targetProfileErr } = await supabase
        .from('user_profiles')
        .select('uid')
        .eq('uid', body.uid)
        .maybeSingle()

      if (targetProfileErr) {
        return json({ error: `Failed to check target profile: ${targetProfileErr.message}` }, { status: 400 })
      }

      if (!targetProfile) {
        if (body.uid === user.id) {
          const { error: insertOwnProfileErr } = await supabase
            .from('user_profiles')
            .insert({ uid: body.uid })
          if (insertOwnProfileErr) {
            return json({ error: `Failed to create user profile: ${insertOwnProfileErr.message}` }, { status: 400 })
          }
        } else {
          return json({ error: 'Target user profile not found. Ask the user to sign in once to initialize profile.' }, { status: 400 })
        }
      }
    }

    // Enforce user status: disabled users cannot create reservations
    {
      const { data: statusRow, error: statusErr } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('uid', body.uid)
        .single()

      if (statusErr) {
        return json({ error: `Failed to verify user status: ${statusErr.message}` }, { status: 400 })
      }

      if (statusRow && String(statusRow.status).toLowerCase() === 'disabled') {
        return json({ error: 'Your account is disabled at the moment. Please contact the admin for assistance.' }, { status: 403 })
      }
    }

    const res_date_iso = new Date(body.res_date).toISOString()

    // Pool reservations are auto-approved on creation; others default to pending unless explicitly set
    const initialStatus: 'pending' | 'confirmed' | 'rejected' =
      body.res_type === 'pool' || body.res_type === 'classroom'
        ? 'confirmed'
        : (body.res_status || 'pending')

    // Proactive cleanup: remove cancelled/rejected reservations for same user, same day, same time slot (any type)
    // This ensures availability after cancellations truly frees the slot before creation.
    {
      const dateOnly = String(res_date_iso).split('T')[0]
      const from = `${dateOnly} 00:00:00+00`
      const to = `${dateOnly} 23:59:59+00`
      // Determine the comparable time key for this request
      const normalizeTime = (raw: string | null | undefined): string | null => {
        if (!raw) return null
        const m = String(raw).match(/^(\d{1,2}):(\d{2})/)
        if (!m) return null
        const hh = m[1].padStart(2, '0')
        const mm = m[2]
        return `${hh}:${mm}`
      }
      const candidateTime = (() => {
        if (body.res_type === 'open_water') {
          const tp = (body.openwater?.time_period || 'AM').toUpperCase()
          return tp === 'PM' ? '13:00' : '08:00'
        }
        if (body.res_type === 'pool') return normalizeTime(body.pool?.start_time)
        if (body.res_type === 'classroom') return normalizeTime(body.classroom?.start_time)
        return null
      })()
      if (candidateTime) {
        const { data: sameDay, error: sameDayErr } = await serviceSupabase
          .from('reservations')
          .select(`
            reservation_id,
            res_status,
            res_type,
            res_openwater(time_period),
            res_pool(start_time),
            res_classroom(start_time)
          `)
          .eq('uid', body.uid)
          .gte('res_date', from)
          .lte('res_date', to)
        if (!sameDayErr) {
          const timeOf = (r: any): string | null => {
            if (r.res_type === 'open_water') {
              const tp = (r?.res_openwater?.time_period || 'AM').toUpperCase()
              return tp === 'PM' ? '13:00' : '08:00'
            }
            if (r.res_type === 'pool') return normalizeTime(r?.res_pool?.start_time ?? null)
            if (r.res_type === 'classroom') return normalizeTime(r?.res_classroom?.start_time ?? null)
            return null
          }
          // Delete only cancelled/rejected at the same time key
          for (const r of sameDay || []) {
            const status = String(r.res_status || '').toLowerCase()
            if (status === 'cancelled' || status === 'rejected') {
              const t = timeOf(r)
              if (t && t === candidateTime) {
                if (r.res_type === 'open_water') {
                  await serviceSupabase.from('res_openwater').delete().eq('reservation_id', r.reservation_id)
                } else if (r.res_type === 'pool') {
                  await serviceSupabase.from('res_pool').delete().eq('reservation_id', r.reservation_id)
                } else if (r.res_type === 'classroom') {
                  await serviceSupabase.from('res_classroom').delete().eq('reservation_id', r.reservation_id)
                }
                await serviceSupabase.from('reservations').delete().eq('reservation_id', r.reservation_id)
              }
            }
          }
        }
      }
    }

    const insertParent = await supabase
      .from('reservations')
      .insert({ uid: body.uid, res_date: res_date_iso, res_type: body.res_type, res_status: initialStatus })
      .select('*')
      .single()
    let parent = insertParent.data
    const parentError = insertParent.error

    if (parentError) {
      const msg = String((parentError as any)?.message || '')
      // Handle unique key violation gracefully with a friendly duplicate message
      if (/duplicate key value/i.test(msg) && /reservations_uid_res_date_key/i.test(msg)) {
        // Attempt to fetch the existing reservation at the exact same res_date
        const { data: existing } = await supabase
          .from('reservations')
          .select(`
            res_status,
            res_type,
            res_openwater(time_period, open_water_type),
            res_pool(start_time, pool_type),
            res_classroom(start_time, classroom_type)
          `)
          .eq('uid', body.uid)
          .eq('res_date', res_date_iso)
          .maybeSingle()

        // If existing is cancelled or rejected, clear it to free the slot, then retry insert
        const status = (existing as any)?.res_status as string | undefined
        const isCleared = !!(status && (status.toLowerCase() === 'cancelled' || status.toLowerCase() === 'rejected'))
        if (isCleared) {
          try {
            // Delete detail rows first (use service role to bypass RLS safely)
            await serviceSupabase.from('res_pool').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
            await serviceSupabase.from('res_classroom').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
            await serviceSupabase.from('res_openwater').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
            // Delete parent row
            await serviceSupabase.from('reservations').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
            // Retry insert
            const retry = await supabase
              .from('reservations')
              .insert({ uid: body.uid, res_date: res_date_iso, res_type: body.res_type, res_status: initialStatus })
              .select('*')
              .single()
            if (retry.error) {
              // If still failing, fall back to error propagation
              return json({ error: retry.error.message || 'Failed to create reservation' }, { status: 400 })
            }
          } catch (cleanupErr) {
            const cm = cleanupErr instanceof Error ? cleanupErr.message : String(cleanupErr)
            return json({ error: `Failed to clear previous cancelled reservation: ${cm}` }, { status: 400 })
          }
          // If we reach here, parent insert after cleanup succeeded; continue to detail insertion below
          // Note: variable `parent` remains previous failed value, but we only use its reservation_id later.
          // To maintain flow, fetch the newly inserted parent row to get reservation_id.
          const { data: parentAfter, error: parentAfterErr } = await supabase
            .from('reservations')
            .select('*')
            .eq('uid', body.uid)
            .eq('res_date', res_date_iso)
            .single()
          if (parentAfterErr) {
            return json({ error: parentAfterErr.message || 'Failed to verify reservation after cleanup' }, { status: 400 })
          }
          // Shadow parent variable for the rest of the flow
          // @ts-ignore shadow runtime variable used below
          parent = parentAfter
        }

        // If we performed cleanup and reinsertion, skip returning duplicate and proceed
        if (!isCleared) {
          const pretty = (s: string | null | undefined) => {
            if (!s) return null
            const x = String(s).toLowerCase()
            if (x === 'course_coaching') return 'Course/Coaching'
            return x.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
          }
          // Build type label and time label based on existing reservation, fallback to requested
          const category = existing?.res_type === 'open_water' ? 'Open Water' : (existing?.res_type === 'pool' ? 'Pool' : (existing?.res_type === 'classroom' ? 'Classroom' : 'Reservation'))
          const subtype = existing?.res_type === 'open_water' ? pretty((existing as any)?.res_openwater?.open_water_type)
            : (existing?.res_type === 'pool' ? pretty((existing as any)?.res_pool?.pool_type)
            : (existing?.res_type === 'classroom' ? pretty((existing as any)?.res_classroom?.classroom_type) : null))
          const typeLabel = subtype ? `${category} ${subtype}` : category

          const dateObj = new Date(body.res_date)
          const datePart = dateObj.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

          // Determine time label: Open Water uses AM/PM period; others use 12-hour hh:mm
          let timeLabel: string
          if (existing?.res_type === 'open_water' || body.res_type === 'open_water') {
            const tp = (existing as any)?.res_openwater?.time_period || body.openwater?.time_period || 'AM'
            timeLabel = String(tp).toUpperCase() === 'PM' ? 'PM' : 'AM'
          } else {
            // Use the precise HH:mm from existing if present; otherwise derive from body
            const hhmm = existing?.res_type === 'pool' ? (existing as any)?.res_pool?.start_time
              : (existing?.res_type === 'classroom' ? (existing as any)?.res_classroom?.start_time
              : (body.res_type === 'pool' ? body.pool?.start_time : body.classroom?.start_time))
            const match = hhmm ? String(hhmm).match(/^(\d{1,2}):(\d{2})/) : null
            if (match) {
              const h = parseInt(match[1], 10)
              const m = parseInt(match[2], 10)
              const h12 = ((h + 11) % 12) + 1
              const ampm = h >= 12 ? 'PM' : 'AM'
              const mm = String(m).padStart(2, '0')
              timeLabel = `${h12}:${mm} ${ampm}`
            } else {
              timeLabel = 'the selected time'
            }
          }

          return json({
            error: 'duplicate',
            message: `Already have a reservation for ${typeLabel} on ${datePart} at ${timeLabel}.`
          }, { status: 400 })
        }
      }
      return json({ error: msg || 'Failed to create reservation' }, { status: 400 })
    }

    let detailError: any = null
    switch (body.res_type) {
      case 'pool':
        if (body.pool && parent?.reservation_id != null) {
          // Targeted cleanup: remove any lingering pool detail rows for same uid/date/start_time
          try {
            const st = body.pool.start_time ?? null
            if (st) {
              await serviceSupabase
                .from('res_pool')
                .delete()
                .eq('uid', body.uid)
                .eq('res_date', res_date_iso)
                .eq('start_time', st)
            }
          } catch {}
          // Lane must be determined before we insert pool details.
          // This prevents creating an inconsistent reservation with lane=null.
          const lane: string | null =
            (body.pool as any).lane != null ? String((body.pool as any).lane) : null;
          if (!lane) {
            return json({
              error: 'no_pool_lanes',
              message: MSG_NO_POOL_LANES,
            }, { status: 409 })
          }

          const insertPayload: any = {
            reservation_id: parent.reservation_id,
            uid: body.uid,
            res_date: res_date_iso,
            ...body.pool,
          };
          insertPayload.lane = lane;

          let ins = await supabase.from('res_pool').insert(insertPayload)
          let error = ins.error
          if (error && /active reservation at this time slot/i.test(String(error.message))) {
            // One more cleanup pass (cancelled/rejected) for same day/time, then retry once
            try {
              const dateOnly = String(res_date_iso).split('T')[0]
              const from = `${dateOnly} 00:00:00+00`
              const to = `${dateOnly} 23:59:59+00`
              const normalizeTime = (raw: string | null | undefined): string | null => {
                if (!raw) return null
                const m = String(raw).match(/^(\d{1,2}):(\d{2})/)
                if (!m) return null
                const hh = m[1].padStart(2, '0')
                const mm = m[2]
                return `${hh}:${mm}`
              }
              const candidateTime = normalizeTime(body.pool?.start_time)
              if (candidateTime) {
                const { data: sameDay } = await serviceSupabase
                  .from('reservations')
                  .select('reservation_id, res_status, res_type, res_openwater(time_period), res_pool(start_time), res_classroom(start_time)')
                  .eq('uid', body.uid)
                  .gte('res_date', from)
                  .lte('res_date', to)
                const timeOf = (r: any): string | null => r.res_type === 'open_water' ? ((r?.res_openwater?.time_period || 'AM').toUpperCase() === 'PM' ? '13:00' : '08:00') : (r.res_type === 'pool' ? normalizeTime(r?.res_pool?.start_time ?? null) : (r.res_type === 'classroom' ? normalizeTime(r?.res_classroom?.start_time ?? null) : null))
                for (const r of sameDay || []) {
                  const status = String(r.res_status || '').toLowerCase()
                  if (status === 'cancelled' || status === 'rejected') {
                    const t = timeOf(r)
                    if (t && t === candidateTime) {
                      if (r.res_type === 'open_water') await serviceSupabase.from('res_openwater').delete().eq('reservation_id', r.reservation_id)
                      if (r.res_type === 'pool') await serviceSupabase.from('res_pool').delete().eq('reservation_id', r.reservation_id)
                      if (r.res_type === 'classroom') await serviceSupabase.from('res_classroom').delete().eq('reservation_id', r.reservation_id)
                      await serviceSupabase.from('reservations').delete().eq('reservation_id', r.reservation_id)
                    }
                  }
                }
              }
              // retry once
              ins = await supabase.from('res_pool').insert(insertPayload)
              error = ins.error
            } catch {}
          }
          detailError = error
        }
        break
      case 'classroom':
        if (body.classroom && parent?.reservation_id != null) {
          // Targeted cleanup: remove any lingering classroom detail rows for same uid/date/start_time
          try {
            const st = body.classroom.start_time ?? null
            if (st) {
              await serviceSupabase
                .from('res_classroom')
                .delete()
                .eq('uid', body.uid)
                .eq('res_date', res_date_iso)
                .eq('start_time', st)
            }
          } catch {}
          // Do not auto-assign room on creation; handled on admin approval
          let ins = await supabase.from('res_classroom').insert({
            reservation_id: parent.reservation_id,
            uid: body.uid,
            res_date: res_date_iso,
            ...body.classroom,
          })
          let error = ins.error
          if (error && /active reservation at this time slot/i.test(String(error.message))) {
            try {
              const dateOnly = String(res_date_iso).split('T')[0]
              const from = `${dateOnly} 00:00:00+00`
              const to = `${dateOnly} 23:59:59+00`
              const normalizeTime = (raw: string | null | undefined): string | null => {
                if (!raw) return null
                const m = String(raw).match(/^(\d{1,2}):(\d{2})/)
                if (!m) return null
                const hh = m[1].padStart(2, '0')
                const mm = m[2]
                return `${hh}:${mm}`
              }
              const candidateTime = normalizeTime(body.classroom?.start_time)
              if (candidateTime) {
                const { data: sameDay } = await serviceSupabase
                  .from('reservations')
                  .select('reservation_id, res_status, res_type, res_openwater(time_period), res_pool(start_time), res_classroom(start_time)')
                  .eq('uid', body.uid)
                  .gte('res_date', from)
                  .lte('res_date', to)
                const timeOf = (r: any): string | null => r.res_type === 'open_water' ? ((r?.res_openwater?.time_period || 'AM').toUpperCase() === 'PM' ? '13:00' : '08:00') : (r.res_type === 'pool' ? normalizeTime(r?.res_pool?.start_time ?? null) : (r.res_type === 'classroom' ? normalizeTime(r?.res_classroom?.start_time ?? null) : null))
                for (const r of sameDay || []) {
                  const status = String(r.res_status || '').toLowerCase()
                  if (status === 'cancelled' || status === 'rejected') {
                    const t = timeOf(r)
                    if (t && t === candidateTime) {
                      if (r.res_type === 'open_water') await serviceSupabase.from('res_openwater').delete().eq('reservation_id', r.reservation_id)
                      if (r.res_type === 'pool') await serviceSupabase.from('res_pool').delete().eq('reservation_id', r.reservation_id)
                      if (r.res_type === 'classroom') await serviceSupabase.from('res_classroom').delete().eq('reservation_id', r.reservation_id)
                      await serviceSupabase.from('reservations').delete().eq('reservation_id', r.reservation_id)
                    }
                  }
                }
              }
              ins = await supabase.from('res_classroom').insert({
                reservation_id: parent.reservation_id,
                uid: body.uid,
                res_date: res_date_iso,
                ...body.classroom,
              })
              error = ins.error
            } catch {}
          }
          detailError = error
        }
        break
      case 'open_water':
        if (body.openwater && parent?.reservation_id != null) {
          // Targeted cleanup: remove any lingering open water detail rows for same uid/date/time_period
          try {
            const tp = (body.openwater?.time_period || 'AM').toUpperCase()
            await serviceSupabase
              .from('res_openwater')
              .delete()
              .eq('uid', body.uid)
              .eq('res_date', res_date_iso)
              .eq('time_period', tp)
          } catch {}
          let ins = await supabase.from('res_openwater').insert({
            reservation_id: parent.reservation_id,
            uid: body.uid,
            res_date: res_date_iso,
            ...body.openwater,
          })
          let error = ins.error
          if (error && /active reservation at this time slot/i.test(String(error.message))) {
            try {
              const dateOnly = String(res_date_iso).split('T')[0]
              const from = `${dateOnly} 00:00:00+00`
              const to = `${dateOnly} 23:59:59+00`
              const tp = (body.openwater?.time_period || 'AM').toUpperCase()
              const candidateTime = tp === 'PM' ? '13:00' : '08:00'
              const { data: sameDay } = await serviceSupabase
                .from('reservations')
                .select('reservation_id, res_status, res_type, res_openwater(time_period), res_pool(start_time), res_classroom(start_time)')
                .eq('uid', body.uid)
                .gte('res_date', from)
                .lte('res_date', to)
              const timeOf = (r: any): string | null => r.res_type === 'open_water' ? ((r?.res_openwater?.time_period || 'AM').toUpperCase() === 'PM' ? '13:00' : '08:00') : (r.res_type === 'pool' ? (r?.res_pool?.start_time || null) : (r.res_type === 'classroom' ? (r?.res_classroom?.start_time || null) : null))
              for (const r of sameDay || []) {
                const status = String(r.res_status || '').toLowerCase()
                if (status === 'cancelled' || status === 'rejected') {
                  const t = timeOf(r)
                  if (t && t === candidateTime) {
                    if (r.res_type === 'open_water') await serviceSupabase.from('res_openwater').delete().eq('reservation_id', r.reservation_id)
                    if (r.res_type === 'pool') await serviceSupabase.from('res_pool').delete().eq('reservation_id', r.reservation_id)
                    if (r.res_type === 'classroom') await serviceSupabase.from('res_classroom').delete().eq('reservation_id', r.reservation_id)
                    await serviceSupabase.from('reservations').delete().eq('reservation_id', r.reservation_id)
                  }
                }
              }
              ins = await supabase.from('res_openwater').insert({
                reservation_id: parent.reservation_id,
                uid: body.uid,
                res_date: res_date_iso,
                ...body.openwater,
              })
              error = ins.error
            } catch {}
          }
          detailError = error
        }
        break
    }

    if (detailError) {
      await supabase.from('reservations').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
      return json({ error: `Failed to create details: ${detailError.message}` }, { status: 400 })
    }

    // Handle buddy group creation if buddies are provided (skip for coaching subtypes)
    const isCoachingSubtype = (
      (body.res_type === 'open_water' && body.openwater?.open_water_type === 'course_coaching') ||
      (body.res_type === 'pool' && body.pool?.pool_type === 'course_coaching') ||
      (body.res_type === 'classroom' && body.classroom?.classroom_type === 'course_coaching')
    );
    if (body.buddies && body.buddies.length > 0 && !isCoachingSubtype) {
      try {
        // Determine time_period for buddy group
        let timePeriod = '';
        if (body.res_type === 'open_water') {
          timePeriod = body.openwater?.time_period || 'AM';
        } else if (body.res_type === 'pool') {
          timePeriod = body.pool?.start_time || '';
        } else if (body.res_type === 'classroom') {
          timePeriod = body.classroom?.start_time || '';
        }

        // Enforce per-buoy pax cap for Open Water autonomous: owner + up to 2 buddies
        const allBuddies: string[] = Array.isArray(body.buddies) ? body.buddies : [];
        const isOWAutonomous = body.res_type === 'open_water' && (body.openwater?.open_water_type || '') !== 'course_coaching';
        const groupBuddies: string[] = isOWAutonomous ? allBuddies.slice(0, 2) : allBuddies;
        const overflowBuddies: string[] = isOWAutonomous ? allBuddies.slice(2) : [];

        // Pre-clean any leftover buddy_group for the same initiator/date/slot/type
        // Use service client to ensure cleanup regardless of RLS context
        try {
          const dateOnly = res_date_iso.split('T')[0];
          const { data: existingGroup } = await serviceSupabase
            .from('buddy_groups')
            .select('id')
            .eq('initiator_uid', body.uid)
            .eq('res_date', dateOnly)
            .eq('time_period', timePeriod)
            .eq('res_type', body.res_type)
            .maybeSingle();
          if (existingGroup?.id) {
            await serviceSupabase.from('buddy_groups').delete().eq('id', existingGroup.id);
          }
        } catch (err) {
          console.warn('[reservations-create] buddy_groups pre-clean warning:', err);
        }

        // Create buddy group
        let buddyGroupId: string | null = null;
        const { data: createdBuddyGroupId, error: buddyGroupError } = await supabase
          .rpc('create_buddy_group_with_members', {
            p_initiator_uid: body.uid,
            p_res_date: res_date_iso.split('T')[0],
            p_time_period: timePeriod,
            p_res_type: body.res_type,
            // Only include up to 2 buddies in the owner's group for OW autonomous (3 pax cap)
            p_buddy_uids: groupBuddies
          });

        if (buddyGroupError) {
          const code = (buddyGroupError as any)?.code || '';
          const message = (buddyGroupError as any)?.message || '';
          if (code === '23505' || /duplicate key value/i.test(String(message))) {
            // Reuse existing group if present
            const dateOnly = res_date_iso.split('T')[0];
            const { data: reuse } = await serviceSupabase
              .from('buddy_groups')
              .select('id')
              .eq('initiator_uid', body.uid)
              .eq('res_date', dateOnly)
              .eq('time_period', timePeriod)
              .eq('res_type', body.res_type)
              .maybeSingle();
            if (reuse?.id) {
              buddyGroupId = reuse.id as unknown as string;
              console.log('Reusing existing buddy group:', buddyGroupId);
            } else {
              console.error('Failed to create buddy group and no reusable group found:', buddyGroupError);
            }
          } else {
            console.error('Failed to create buddy group:', buddyGroupError);
          }
        } else {
          buddyGroupId = createdBuddyGroupId as unknown as string;
          console.log('Created buddy group:', buddyGroupId);
        }

        // If we have a buddyGroupId (created or reused), proceed to link initiator and buddies
        if (buddyGroupId) {
          // Update initiator's reservation with buddy_group_id
          // Use serviceSupabase to bypass RLS restrictions on updates to specific columns if any
          if (body.res_type === 'open_water') {
            const tp = (body.openwater?.time_period || 'AM').toUpperCase();
            await serviceSupabase
              .from('res_openwater')
              .update({ buddy_group_id: buddyGroupId })
              .eq('uid', body.uid)
              .eq('res_date', res_date_iso)
              .eq('time_period', tp);
          } else if (body.res_type === 'pool') {
            // For pool, we must match start_time to avoid updating wrong slot if multiple exist
            const startTime = body.pool?.start_time || null;
            if (startTime) {
              await serviceSupabase
                .from('res_pool')
                .update({ buddy_group_id: buddyGroupId })
                .eq('uid', body.uid)
                .eq('res_date', res_date_iso)
                .eq('start_time', startTime);
            }
          } else if (body.res_type === 'classroom') {
            const startTime = body.classroom?.start_time || null;
            if (startTime) {
              await serviceSupabase
                .from('res_classroom')
                .update({ buddy_group_id: buddyGroupId })
                .eq('uid', body.uid)
                .eq('res_date', res_date_iso)
                .eq('start_time', startTime);
            }
          }

          // Create reservations for buddies that belong to this group (if they don't already have one)
          for (const buddyUid of groupBuddies) {
            if (buddyUid === body.uid) continue; // Skip initiator

            // Check if buddy already has a reservation for this date AND same slot (time key)
            let reuseExisting = false
            let existingResId: number | null = null
            if (body.res_type === 'open_water') {
              const { data: existingOw } = await serviceSupabase
                .from('reservations')
                .select('reservation_id, res_openwater(time_period)')
                .eq('uid', buddyUid)
                .eq('res_type', 'open_water')
                .gte('res_date', res_date_iso.split('T')[0] + ' 00:00:00+00')
                .lte('res_date', res_date_iso.split('T')[0] + ' 23:59:59+00')
                .in('res_status', ['pending', 'confirmed'])
                .maybeSingle()
              if (existingOw && body.openwater?.time_period) {
                const tp = (existingOw as any)?.res_openwater?.time_period || null
                if (tp && String(tp).toUpperCase() === String(body.openwater.time_period).toUpperCase()) {
                  reuseExisting = true
                  existingResId = (existingOw as any).reservation_id || null
                }
              }
            } else if (body.res_type === 'pool') {
              const { data: existingPl } = await serviceSupabase
                .from('reservations')
                .select('reservation_id, res_pool(start_time)')
                .eq('uid', buddyUid)
                .eq('res_type', 'pool')
                .gte('res_date', res_date_iso.split('T')[0] + ' 00:00:00+00')
                .lte('res_date', res_date_iso.split('T')[0] + ' 23:59:59+00')
                .in('res_status', ['pending', 'confirmed'])
                .maybeSingle()
              if (existingPl && body.pool?.start_time) {
                const st = (existingPl as any)?.res_pool?.start_time || null
                if (st && String(st).slice(0,5) === String(body.pool.start_time).slice(0,5)) {
                  reuseExisting = true
                  existingResId = (existingPl as any).reservation_id || null
                }
              }
            } else if (body.res_type === 'classroom') {
              const { data: existingCl } = await serviceSupabase
                .from('reservations')
                .select('reservation_id, res_classroom(start_time)')
                .eq('uid', buddyUid)
                .eq('res_type', 'classroom')
                .gte('res_date', res_date_iso.split('T')[0] + ' 00:00:00+00')
                .lte('res_date', res_date_iso.split('T')[0] + ' 23:59:59+00')
                .in('res_status', ['pending', 'confirmed'])
                .maybeSingle()
              if (existingCl && body.classroom?.start_time) {
                const st = (existingCl as any)?.res_classroom?.start_time || null
                if (st && String(st).slice(0,5) === String(body.classroom.start_time).slice(0,5)) {
                  reuseExisting = true
                  existingResId = (existingCl as any).reservation_id || null
                }
              }
            }

            if (reuseExisting && existingResId) {
              console.log(`Buddy ${buddyUid} already has same-slot reservation, linking to group`)
              if (body.res_type === 'open_water') {
                const { data: updOw } = await serviceSupabase
                  .from('res_openwater')
                  .update({ buddy_group_id: buddyGroupId })
                  .eq('reservation_id', existingResId)
                  .eq('uid', buddyUid)
                  .select('uid')
                if (!updOw || updOw.length === 0) {
                  // No detail existed; create it
                  if (body.openwater) {
                    await serviceSupabase
                      .from('res_openwater')
                      .insert({
                        reservation_id: existingResId,
                        uid: buddyUid,
                        res_date: res_date_iso,
                        buddy_group_id: buddyGroupId,
                        ...body.openwater,
                      })
                  }
                }
              } else if (body.res_type === 'pool') {
                const { data: updPl } = await serviceSupabase
                  .from('res_pool')
                  .update({ buddy_group_id: buddyGroupId })
                  .eq('reservation_id', existingResId)
                  .eq('uid', buddyUid)
                  .select('uid')
                if (!updPl || updPl.length === 0) {
                  if (body.pool) {
                    await serviceSupabase
                      .from('res_pool')
                      .insert({
                        reservation_id: existingResId,
                        uid: buddyUid,
                        res_date: res_date_iso,
                        buddy_group_id: buddyGroupId,
                        ...body.pool,
                      })
                  }
                }
                // Ensure buddy parent is confirmed for pool
                await serviceSupabase
                  .from('reservations')
                  .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
                  .eq('reservation_id', existingResId)
                  .eq('uid', buddyUid)
              } else if (body.res_type === 'classroom') {
                const { data: updCl } = await serviceSupabase
                  .from('res_classroom')
                  .update({ buddy_group_id: buddyGroupId })
                  .eq('reservation_id', existingResId)
                  .eq('uid', buddyUid)
                  .select('uid')
                if (!updCl || updCl.length === 0) {
                  if (body.classroom) {
                    await serviceSupabase
                      .from('res_classroom')
                      .insert({
                        reservation_id: existingResId,
                        uid: buddyUid,
                        res_date: res_date_iso,
                        buddy_group_id: buddyGroupId,
                        ...body.classroom,
                      })
                  }
                }
                await serviceSupabase
                  .from('reservations')
                  .update({ res_status: 'confirmed', updated_at: new Date().toISOString() })
                  .eq('reservation_id', existingResId)
                  .eq('uid', buddyUid)
              }
              continue
            }

            // Create reservation for buddy (pool/classroom buddies are auto-confirmed; OW buddies pending)
            const buddyInitialStatus: 'pending' | 'confirmed' =
              body.res_type === 'pool' || body.res_type === 'classroom' ? 'confirmed' : 'pending'
            let { data: buddyParent, error: buddyParentError } = await serviceSupabase
              .from('reservations')
              .insert({
                uid: buddyUid,
                res_date: res_date_iso,
                res_type: body.res_type,
                res_status: buddyInitialStatus,
              })
              .select('*')
              .maybeSingle();

            if (buddyParentError) {
              // If duplicate due to cancelled/rejected prior reservation, sweep at same slot and retry
              const errMsg = (buddyParentError as any)?.message || '';
              if (/duplicate key value/i.test(String(errMsg))) {
                try {
                  const dateOnly = res_date_iso.split('T')[0];
                  const from = `${dateOnly} 00:00:00+00`;
                  const to = `${dateOnly} 23:59:59+00`;
                  const normalizeTime = (raw: string | null | undefined): string | null => {
                    if (!raw) return null;
                    const m = String(raw).match(/^(\d{1,2}):(\d{2})/);
                    if (!m) return null;
                    const hh = m[1].padStart(2, '0');
                    const mm = m[2];
                    return `${hh}:${mm}`;
                  };
                  const candidateTime = (() => {
                    if (body.res_type === 'open_water') {
                      const tp = (body.openwater?.time_period || 'AM').toUpperCase();
                      return tp === 'PM' ? '13:00' : '08:00';
                    }
                    if (body.res_type === 'pool') return normalizeTime(body.pool?.start_time);
                    if (body.res_type === 'classroom') return normalizeTime(body.classroom?.start_time);
                    return null;
                  })();
                  if (candidateTime) {
                    const { data: sameDay } = await serviceSupabase
                      .from('reservations')
                      .select('reservation_id, res_status, res_type, res_openwater(time_period), res_pool(start_time), res_classroom(start_time)')
                      .eq('uid', buddyUid)
                      .gte('res_date', from)
                      .lte('res_date', to);
                    const timeOf = (r: any): string | null => {
                      if (r.res_type === 'open_water') {
                        const tp = (r?.res_openwater?.time_period || 'AM').toUpperCase();
                        return tp === 'PM' ? '13:00' : '08:00';
                      }
                      if (r.res_type === 'pool') return normalizeTime(r?.res_pool?.start_time ?? null);
                      if (r.res_type === 'classroom') return normalizeTime(r?.res_classroom?.start_time ?? null);
                      return null;
                    };
                    for (const r of sameDay || []) {
                      const status = String(r.res_status || '').toLowerCase();
                      if (status === 'cancelled' || status === 'rejected') {
                        const t = timeOf(r);
                        if (t && t === candidateTime) {
                          if (r.res_type === 'open_water') await serviceSupabase.from('res_openwater').delete().eq('reservation_id', r.reservation_id);
                          if (r.res_type === 'pool') await serviceSupabase.from('res_pool').delete().eq('reservation_id', r.reservation_id);
                          if (r.res_type === 'classroom') await serviceSupabase.from('res_classroom').delete().eq('reservation_id', r.reservation_id);
                          await serviceSupabase.from('reservations').delete().eq('reservation_id', r.reservation_id);
                        }
                      }
                    }
                  }
                  const retry = await serviceSupabase
                    .from('reservations')
                    .insert({
                      uid: buddyUid,
                      res_date: res_date_iso,
                      res_type: body.res_type,
                      res_status: buddyInitialStatus,
                    })
                    .select('*')
                    .maybeSingle();
                  buddyParent = retry.data;
                  buddyParentError = retry.error as any;
                } catch (sweepErr) {
                  console.error(`[reservations-create] Failed to sweep cancelled for buddy ${buddyUid}:`, sweepErr);
                }
              }
              if (buddyParentError) {
                console.error(`Failed to create reservation for buddy ${buddyUid}:`, buddyParentError);
                continue; // Skip this buddy
              }
            } else {
              console.log(`Created reservation for buddy ${buddyUid}`);
            }

            // Create detail row for buddy reservation, mirroring main reservation logic
            try {
              if (body.res_type === 'open_water' && body.openwater && buddyParent?.reservation_id != null) {
                const { error: buddyDetailErr } = await serviceSupabase
                  .from('res_openwater')
                  .insert({
                    reservation_id: buddyParent.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    buddy_group_id: buddyGroupId,
                    ...body.openwater,
                  });
                if (buddyDetailErr) {
                  console.error(`Failed to create res_openwater for buddy ${buddyUid}:`, buddyDetailErr);
                }
              } else if (body.res_type === 'pool' && body.pool && buddyParent?.reservation_id != null) {
                const { error: buddyDetailErr } = await serviceSupabase
                  .from('res_pool')
                  .insert({
                    reservation_id: buddyParent.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    buddy_group_id: buddyGroupId,
                    ...body.pool,
                  });
                if (buddyDetailErr) {
                  console.error(`Failed to create res_pool for buddy ${buddyUid}:`, buddyDetailErr);
                }
              } else if (body.res_type === 'classroom' && body.classroom && buddyParent?.reservation_id != null) {
                const { error: buddyDetailErr } = await serviceSupabase
                  .from('res_classroom')
                  .insert({
                    reservation_id: buddyParent.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    buddy_group_id: buddyGroupId,
                    ...body.classroom,
                  });
                if (buddyDetailErr) {
                  console.error(`Failed to create res_classroom for buddy ${buddyUid}:`, buddyDetailErr);
                }
              }
            } catch (detailErr) {
              console.error(`Unexpected error creating detail for buddy ${buddyUid}:`, detailErr);
            }
          }

          // Create reservations for overflow buddies WITHOUT linking them to the owner's buddy group.
          // This lets the system auto-pair them on a separate buoy/new group, respecting 3 pax per buoy.
          for (const buddyUid of overflowBuddies) {
            if (buddyUid === body.uid) continue;
            // Create reservation parent (same status rule)
            const buddyInitialStatus: 'pending' | 'confirmed' =
              body.res_type === 'pool' || body.res_type === 'classroom' ? 'confirmed' : 'pending';
            const { data: parentRow, error: parentErr } = await serviceSupabase
              .from('reservations')
              .insert({ uid: buddyUid, res_date: res_date_iso, res_type: body.res_type, res_status: buddyInitialStatus })
              .select('*')
              .maybeSingle();
            if (parentErr) {
              console.error(`Failed to create reservation for overflow buddy ${buddyUid}:`, parentErr);
              continue;
            }
            try {
              if (body.res_type === 'open_water' && body.openwater && parentRow?.reservation_id != null) {
                await serviceSupabase
                  .from('res_openwater')
                  .insert({
                    reservation_id: parentRow.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    // no buddy_group_id on purpose
                    ...body.openwater,
                  });
              } else if (body.res_type === 'pool' && body.pool && parentRow?.reservation_id != null) {
                await serviceSupabase
                  .from('res_pool')
                  .insert({
                    reservation_id: parentRow.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    // no buddy_group_id
                    ...body.pool,
                  });
              } else if (body.res_type === 'classroom' && body.classroom && parentRow?.reservation_id != null) {
                await serviceSupabase
                  .from('res_classroom')
                  .insert({
                    reservation_id: parentRow.reservation_id,
                    uid: buddyUid,
                    res_date: res_date_iso,
                    // no buddy_group_id
                    ...body.classroom,
                  });
              }
            } catch (e) {
              console.error(`Failed to create detail for overflow buddy ${buddyUid}:`, e);
            }
          }
        }
      } catch (buddyError) {
        console.error('Error handling buddy group:', buddyError);
        // Don't fail the main reservation
      }
    }

    // Enqueue assignment job for open water slot at the very end
    if (body.res_type === 'open_water' && body.openwater?.time_period) {
      const dateOnly = res_date_iso.split('T')[0]
      const { error: queueErr } = await serviceSupabase
        .from('assignment_queue')
        .upsert(
          {
            res_date: dateOnly,
            time_period: body.openwater.time_period,
            status: 'pending',
          },
          { onConflict: 'res_date,time_period' },
        )

      if (queueErr) {
        console.error('[reservations-create] Failed to enqueue assignment job', queueErr.message ?? queueErr)
      } else {
        console.log('[reservations-create] Enqueued assignment job', {
          res_date: dateOnly,
          time_period: body.openwater.time_period,
        })
      }

      // Trigger auto-assign-buoy edge function as the final step
      try {
        const autoAssignResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-assign-buoy`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            res_date: dateOnly,
            time_period: body.openwater.time_period,
          }),
        })

        const autoAssignBody = await autoAssignResponse.json().catch(() => null)
        if (!autoAssignResponse.ok) {
          console.error('[reservations-create] auto-assign-buoy failed', autoAssignResponse.status, autoAssignBody)
        } else {
          console.log('[reservations-create] auto-assign-buoy triggered', {
            res_date: dateOnly,
            time_period: body.openwater.time_period,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[reservations-create] Error calling auto-assign-buoy:', msg)
      }
    }

    return json(parent, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
