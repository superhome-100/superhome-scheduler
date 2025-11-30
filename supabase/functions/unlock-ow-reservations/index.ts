// Supabase Edge Function: unlock-ow-reservations
// - For a given date and time_period, clear res_openwater.buoy
// - Then triggers auto-assign-buoy to recompute groupings

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface Payload {
  res_date: string // 'YYYY-MM-DD' or ISO string
  time_period: string // 'AM' | 'PM'
}

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {}),
    },
    ...init,
  })
}

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req)
    if (pre) return pre

    if (req.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, { status: 405 })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const body = (await req.json()) as Partial<Payload>
    if (!body.res_date || !body.time_period) {
      return json({ error: 'Invalid payload' }, { status: 400 })
    }

    const dateOnly = String(body.res_date).split('T')[0]
    const timePeriod = String(body.time_period)

    // 1) Unlock buoys for this slot
    const unlockResult = await unlockBuoysForSlot(supabase, dateOnly, timePeriod)

    // 2) Trigger auto-assign-buoy for the same slot
    const autoAssignResult = await triggerAutoAssign(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      res_date: dateOnly,
      time_period: timePeriod,
    })

    return json(
      {
        success: true,
        cleared: unlockResult.cleared,
        autoAssign: autoAssignResult,
      },
      { status: 200 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[unlock-ow-reservations] Error:', message)
    return json({ error: message }, { status: 500 })
  }
})

async function unlockBuoysForSlot(
  supabase: any,
  res_date: string,
  time_period: string,
): Promise<{ cleared: number }> {
  console.log('[unlock-ow-reservations] Unlocking buoys for', res_date, time_period)

  const dayStart = new Date(res_date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('res_openwater')
    .select('reservation_id, buoy')
    .eq('time_period', time_period)
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString())
    .not('buoy', 'is', null)

  if (error) {
    console.error('[unlock-ow-reservations] Failed to load res_openwater rows', error)
    throw new Error(error.message ?? 'Failed to load res_openwater rows')
  }

  const rows = (data ?? []) as Array<{ reservation_id: number; buoy: string | null }>
  if (!rows.length) {
    console.log('[unlock-ow-reservations] No buoys to unlock for this slot')
    return { cleared: 0 }
  }

  const { error: updateErr } = await supabase
    .from('res_openwater')
    .update({ buoy: null })
    .eq('time_period', time_period)
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString())
    .not('buoy', 'is', null)

  if (updateErr) {
    console.error('[unlock-ow-reservations] Failed to clear buoys', updateErr)
    throw new Error(updateErr.message ?? 'Failed to clear buoys')
  }

  console.log('[unlock-ow-reservations] Cleared buoys for rows:', rows.length)
  return { cleared: rows.length }
}

async function triggerAutoAssign(
  supabaseUrl: string,
  serviceKey: string,
  payload: Payload,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const url = `${supabaseUrl}/functions/v1/auto-assign-buoy`

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(payload),
    })

    const body = await res.json().catch(() => null)

    if (!res.ok) {
      console.error('[unlock-ow-reservations] auto-assign-buoy failed', res.status, body)
    }

    return { ok: res.ok, status: res.status, body }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[unlock-ow-reservations] Error calling auto-assign-buoy:', message)
    return { ok: false, status: 500, body: { error: message } }
  }
}
