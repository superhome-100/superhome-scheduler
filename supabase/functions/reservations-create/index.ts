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

type PoolDetails = { start_time: string | null; end_time: string | null; lane?: string | null; pool_type?: string | null; note?: string | null }
 type ClassroomDetails = { start_time: string | null; end_time: string | null; room?: string | null; classroom_type?: string | null; note?: string | null }
 type OpenWaterDetails = { time_period: string | null; depth_m?: number | null; buoy?: string | null; auto_adjust_closest?: boolean; pulley?: boolean; deep_fim_training?: boolean; bottom_plate?: boolean; large_buoy?: boolean; open_water_type?: string | null; student_count?: number | null; group_id?: number | null; note?: string | null }

interface Payload {
  uid: string
  res_type: ReservationType
  res_date: string // ISO or YYYY-MM-DD
  res_status?: 'pending' | 'confirmed' | 'rejected'
  pool?: PoolDetails
  classroom?: ClassroomDetails
  openwater?: OpenWaterDetails
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
          const { error } = await supabase.from('res_pool').insert({ uid: body.uid, res_date: res_date_iso, ...body.pool })
          detailError = error
        }
        break
      case 'classroom':
        if (body.classroom) {
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

    return json(parent, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
