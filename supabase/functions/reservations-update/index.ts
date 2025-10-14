// Supabase Edge Function: reservations-update
// - Owner or admin can update reservation parent fields and details
// - Triggers pairing via openwater-auto-pair when confirming open water

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

    // Update parent if provided
    if (body.parent && (body.parent.res_status || body.parent.res_date)) {
      const parentUpdate: any = {}
      if (body.parent.res_status) parentUpdate.res_status = body.parent.res_status
      if (body.parent.res_date) parentUpdate.res_date = body.parent.res_date
      parentUpdate.updated_at = new Date().toISOString()

      const { error: parentErr } = await supabase
        .from('reservations')
        .update(parentUpdate)
        .eq('uid', body.uid)
        .eq('res_date', body.res_date)
      if (parentErr) return json({ error: parentErr.message }, { status: 400 })
    }

    // Determine current type to choose detail table
    const { data: cur, error: curErr } = await supabase
      .from('reservations')
      .select('res_type')
      .eq('uid', body.uid)
      .eq('res_date', body.res_date)
      .single()

    if (curErr) return json({ error: curErr.message }, { status: 404 })

    if (cur.res_type === 'pool' && body.pool) {
      const { error } = await supabase.from('res_pool').update(body.pool).eq('uid', body.uid).eq('res_date', body.res_date)
      if (error) return json({ error: error.message }, { status: 400 })
    } else if (cur.res_type === 'classroom' && body.classroom) {
      const { error } = await supabase.from('res_classroom').update(body.classroom).eq('uid', body.uid).eq('res_date', body.res_date)
      if (error) return json({ error: error.message }, { status: 400 })
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
