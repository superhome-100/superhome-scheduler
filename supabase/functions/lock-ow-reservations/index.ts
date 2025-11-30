// Supabase Edge Function: lock-ow-reservations
// - For a given date and time_period, snapshot buoy assignments
//   by copying buoy_group.buoy_name into res_openwater.buoy
// - Then triggers auto-assign-buoy to recompute groupings using the locked buoys

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

    // 1) Lock current buoy assignments by copying from buoy_group into res_openwater.buoy
    const lockResult = await lockBuoysForSlot(supabase, dateOnly, timePeriod)

    // 2) Trigger auto-assign-buoy for the same slot so it can recompute groups
    const autoAssignResult = await triggerAutoAssign(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      res_date: dateOnly,
      time_period: timePeriod,
    })

    return json(
      {
        success: true,
        locked: lockResult.locked,
        updated: lockResult.updated,
        autoAssign: autoAssignResult,
      },
      { status: 200 },
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[lock-ow-reservations] Error:', message)
    return json({ error: message }, { status: 500 })
  }
})

async function lockBuoysForSlot(
  supabase: any,
  res_date: string,
  time_period: string,
): Promise<{ locked: number; updated: number }> {
  console.log('[lock-ow-reservations] Locking buoys for', res_date, time_period)

  const dayStart = new Date(res_date)
  dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1)

  const { data, error } = await supabase
    .from('res_openwater')
    .select(
      `
        reservation_id,
        buoy,
        buoy_group:buoy_group (
          buoy_name
        )
      `,
    )
    .eq('time_period', time_period)
    .gte('res_date', dayStart.toISOString())
    .lt('res_date', dayEnd.toISOString())
    .not('group_id', 'is', null)

  if (error) {
    console.error('[lock-ow-reservations] Failed to load res_openwater rows', error)
    throw new Error(error.message ?? 'Failed to load res_openwater rows')
  }

  const rows = (data ?? []) as Array<{
    reservation_id: number
    buoy: string | null
    buoy_group?: { buoy_name: string | null } | null
  }>

  let locked = 0
  let updated = 0

  // Group updates by target buoy so we can perform batched updates per buoy_name.
  const updatesByBuoy = new Map<string, number[]>()

  for (const row of rows) {
    const current = row.buoy ?? null
    const target = row.buoy_group?.buoy_name ?? null
    // Only lock when there is a buoy_name on the group and it's different from current
    if (!target || current === target) continue

    const list = updatesByBuoy.get(target) ?? []
    list.push(row.reservation_id)
    updatesByBuoy.set(target, list)
  }

  for (const [targetBuoy, reservationIds] of updatesByBuoy.entries()) {
    if (!reservationIds.length) continue

    const { error: updateErr } = await supabase
      .from('res_openwater')
      .update({ buoy: targetBuoy })
      .in('reservation_id', reservationIds)

    if (updateErr) {
      console.error('[lock-ow-reservations] Failed batch update for buoy', targetBuoy, updateErr)
      continue
    }

    locked += reservationIds.length
  }

  updated = locked
  console.log('[lock-ow-reservations] Locked buoys for rows (batched):', locked)

  return { locked, updated }
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
      console.error('[lock-ow-reservations] auto-assign-buoy failed', res.status, body)
    }

    return { ok: res.ok, status: res.status, body }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[lock-ow-reservations] Error calling auto-assign-buoy:', message)
    return { ok: false, status: 500, body: { error: message } }
  }
}
