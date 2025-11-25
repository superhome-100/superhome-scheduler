// Supabase Edge Function: reservations-create
// - Owner or admin can create reservations
// - Creates parent reservation and type-specific detail; rolls back on failure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

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

// ---- Pool lane auto-assignment helpers ----
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

async function findAvailableLane(
  supabase: any,
  uid: string,
  res_date_iso: string,
  start_time: string | null,
  end_time: string | null
): Promise<string | null> {
  // Fetch existing pool reservations for the same date
  const { data, error } = await supabase
    .from('res_pool')
    .select('lane, start_time, end_time')
    .eq('res_date', res_date_iso);

  if (error) {
    console.error('Error fetching existing pool reservations:', error);
    return null;
  }

  const occupiedByLane: Record<string, boolean> = {};
  for (const row of data || []) {
    if (row.lane && overlaps(row.start_time, row.end_time, start_time, end_time)) {
      occupiedByLane[row.lane] = true;
    }
  }

  // Lanes 1..8
  for (let lane = 1; lane <= 8; lane++) {
    const key = String(lane);
    if (!occupiedByLane[key]) return key;
  }
  return null;
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

    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await req.json()) as Payload;
    if (!body?.uid || !body?.res_type || !body?.res_date) return json({ error: 'Invalid payload' }, { status: 400 });

    // Validate cut-off time
    if (!isBeforeCutoff(body.res_date, body.res_type)) {
      const cutoffTime = getCutoffTime(body.res_type, body.res_date);
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
        .select('res_status, res_pool(start_time, end_time)')
        .eq('res_type', 'pool')
        .gte('res_date', from)
        .lte('res_date', to)
        .in('res_status', ['pending', 'confirmed']);
      if (overErr) {
        return json({ error: overErr.message }, { status: 400 });
      }
      const overlapsCount = (overlaps || []).reduce((acc: number, r: any) => {
        const sDb = toMin(r?.res_pool?.start_time ?? null);
        const eDb = toMin(r?.res_pool?.end_time ?? null);
        if (Number.isNaN(sDb) || Number.isNaN(eDb) || Number.isNaN(sUser) || Number.isNaN(eUser)) return acc;
        return sDb < eUser && eDb > sUser ? acc + 1 : acc;
      }, 0);
      const CAPACITY = 8; // lanes 1..8
      if (overlapsCount >= CAPACITY) {
        return json({ error: 'No pool lanes available for the selected time' }, { status: 409 });
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
      const { data: sameType, error: sameErr } = await supabase
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
      let candidateTime: string | null = null;
      if (body.res_type === 'open_water') {
        const tp = (body.openwater?.time_period || 'AM').toUpperCase();
        candidateTime = tp === 'PM' ? '13:00' : '08:00';
      } else if (body.res_type === 'pool') {
        candidateTime = body.pool?.start_time ?? null;
      } else if (body.res_type === 'classroom') {
        candidateTime = body.classroom?.start_time ?? null;
      }

      if (!candidateTime) {
        return json({ error: 'Missing start time for conflict check' }, { status: 400 });
      }

      // Fetch reservations of other types for same user and same day
      const { data: existing, error: existErr } = await supabase
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
        if (r.res_type === 'pool') return r?.res_pool?.start_time ?? null;
        if (r.res_type === 'classroom') return r?.res_classroom?.start_time ?? null;
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

    const { data: parent, error: parentError } = await supabase
      .from('reservations')
      .insert({ uid: body.uid, res_date: res_date_iso, res_type: body.res_type, res_status: body.res_status || 'pending' })
      .select('*')
      .single()

    if (parentError) return json({ error: parentError.message }, { status: 400 })

    let detailError: any = null
    switch (body.res_type) {
      case 'pool':
        if (body.pool) {
          // Do not auto-assign lane on creation; handled on admin approval
          const { error } = await supabase.from('res_pool').insert({ uid: body.uid, res_date: res_date_iso, ...body.pool })
          detailError = error
        }
        break
      case 'classroom':
        if (body.classroom) {
          // Do not auto-assign room on creation; handled on admin approval
          const { error } = await supabase.from('res_classroom').insert({ uid: body.uid, res_date: res_date_iso, ...body.classroom })
          detailError = error
        }
        break
      case 'open_water':
        if (body.openwater) {
          const { error } = await supabase.from('res_openwater').insert({ uid: body.uid, res_date: res_date_iso, ...body.openwater })
          detailError = error
        }
        break
    }

    if (detailError) {
      await supabase.from('reservations').delete().eq('uid', body.uid).eq('res_date', res_date_iso)
      return json({ error: `Failed to create details: ${detailError.message}` }, { status: 400 })
    }

    // Handle buddy group creation if buddies are provided
    if (body.buddies && body.buddies.length > 0) {
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

        // Create buddy group
        const { data: buddyGroupId, error: buddyGroupError } = await supabase
          .rpc('create_buddy_group_with_members', {
            p_initiator_uid: body.uid,
            p_res_date: res_date_iso.split('T')[0],
            p_time_period: timePeriod,
            p_res_type: body.res_type,
            p_buddy_uids: body.buddies
          });

        if (buddyGroupError) {
          console.error('Failed to create buddy group:', buddyGroupError);
          // Don't fail the main reservation, just log the error
        } else {
          console.log('Created buddy group:', buddyGroupId);

          // Update initiator's reservation with buddy_group_id
          if (body.res_type === 'open_water') {
            await supabase
              .from('res_openwater')
              .update({ buddy_group_id: buddyGroupId })
              .eq('uid', body.uid)
              .eq('res_date', res_date_iso);
          } else if (body.res_type === 'pool') {
            await supabase
              .from('res_pool')
              .update({ buddy_group_id: buddyGroupId })
              .eq('uid', body.uid)
              .eq('res_date', res_date_iso);
          }

          // Create reservations for buddies (if they don't already have one)
          for (const buddyUid of body.buddies) {
            if (buddyUid === body.uid) continue; // Skip initiator

            // Check if buddy already has a reservation for this date/time
            const { data: existingRes } = await supabase
              .from('reservations')
              .select('uid')
              .eq('uid', buddyUid)
              .eq('res_type', body.res_type)
              .gte('res_date', res_date_iso.split('T')[0] + ' 00:00:00+00')
              .lte('res_date', res_date_iso.split('T')[0] + ' 23:59:59+00')
              .in('res_status', ['pending', 'confirmed'])
              .maybeSingle();

            if (existingRes) {
              console.log(`Buddy ${buddyUid} already has a reservation, linking to group`);
              // Just link their existing reservation to the group
              if (body.res_type === 'open_water') {
                await supabase
                  .from('res_openwater')
                  .update({ buddy_group_id: buddyGroupId })
                  .eq('uid', buddyUid)
                  .eq('res_date', res_date_iso);
              } else if (body.res_type === 'pool') {
                await supabase
                  .from('res_pool')
                  .update({ buddy_group_id: buddyGroupId })
                  .eq('uid', buddyUid)
                  .eq('res_date', res_date_iso);
              }
              continue;
            }

            // Create reservation for buddy
            const { data: buddyParent, error: buddyParentError } = await supabase
              .from('reservations')
              .insert({
                uid: buddyUid,
                res_date: res_date_iso,
                res_type: body.res_type,
                res_status: 'pending' // Buddies need to confirm
              })
              .select('*')
              .maybeSingle();

            if (buddyParentError) {
              console.error(`Failed to create reservation for buddy ${buddyUid}:`, buddyParentError);
              continue; // Skip this buddy
            }

            // Create type-specific detail for buddy
            let buddyDetailError: any = null;
            switch (body.res_type) {
              case 'pool':
                if (body.pool) {
                  const { error } = await supabase.from('res_pool').insert({
                    uid: buddyUid,
                    res_date: res_date_iso,
                    ...body.pool,
                    buddy_group_id: buddyGroupId
                  });
                  buddyDetailError = error;
                }
                break;
              case 'open_water':
                if (body.openwater) {
                  const { error } = await supabase.from('res_openwater').insert({
                    uid: buddyUid,
                    res_date: res_date_iso,
                    ...body.openwater,
                    buddy_group_id: buddyGroupId
                  });
                  buddyDetailError = error;
                }
                break;
            }

            if (buddyDetailError) {
              console.error(`Failed to create details for buddy ${buddyUid}:`, buddyDetailError);
              // Rollback buddy reservation
              await supabase.from('reservations').delete().eq('uid', buddyUid).eq('res_date', res_date_iso);
            } else {
              console.log(`Created reservation for buddy ${buddyUid}`);
            }
          }
        }
      } catch (buddyError) {
        console.error('Error handling buddy group:', buddyError);
        // Don't fail the main reservation
      }
    }

    return json(parent, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
