import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface Payload {
  reservation_id: string
  buoy_id: string
  res_date: string // ISO timestamp or date string matching reservations/res_openwater res_date
  time_period: string
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 })
    }

    // Client with caller JWT, used only for auth and privilege checks (RLS enforced)
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    // Service-role client used for actual data mutations/reads that must bypass RLS
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Payload
    console.log('[openwater-move-buoy] Incoming payload', body)
    if (!body?.reservation_id || !body?.res_date || !body?.buoy_id || !body?.time_period) {
      return json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Ensure caller is admin (same pattern as reservations-create)
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .maybeSingle()

    if (profileErr) {
      return json({ error: profileErr.message }, { status: 403 })
    }

    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
    if (!isAdmin) {
      return json({ error: 'Forbidden' }, { status: 403 })
    }

    // Locate the existing open water reservation detail row
    const { data: owRow, error: owErr } = await serviceSupabase
      .from('res_openwater')
      .select('uid, res_date, time_period, group_id, open_water_type')
      .eq('uid', body.reservation_id)
      .maybeSingle()

    if (owErr) {
      console.error('[openwater-move-buoy] Error loading res_openwater row', owErr.message)
      return json({ error: owErr.message }, { status: 400 })
    }

    if (!owRow) {
      console.warn('[openwater-move-buoy] No res_openwater row found for reservation', {
        reservation_id: body.reservation_id,
        res_date: body.res_date,
      })
      return json({ error: 'Open water reservation not found' }, { status: 404 })
    }

    const currentGroupId = owRow.group_id as number | null
    const timePeriod = ((owRow.time_period || body.time_period) || 'AM').toUpperCase() === 'PM' ? 'PM' : 'AM'
    console.log('[openwater-move-buoy] Loaded res_openwater row', {
      uid: owRow.uid,
      res_date: owRow.res_date,
      time_period: owRow.time_period,
      normalized_time_period: timePeriod,
      currentGroupId,
      targetBuoy: body.buoy_id,
    })

    let targetGroupId: number

    // For now, ignore body.buoy_group_id when choosing the *target* group.
    // Always find (or create) the group for the selected buoy/date/period.
    const { data: existingGroup, error: groupErr } = await serviceSupabase
      .from('buoy_group')
      .select('id')
      .eq('res_date', owRow.res_date)
      .eq('time_period', timePeriod)
      .eq('buoy_name', body.buoy_id)
      .maybeSingle()

    if (groupErr) {
      console.error('[openwater-move-buoy] Error loading existing buoy_group', groupErr.message)
      return json({ error: groupErr.message }, { status: 400 })
    }

    if (existingGroup) {
      console.log('[openwater-move-buoy] Reusing existing buoy_group', {
        group_id: existingGroup.id,
      })
      targetGroupId = existingGroup.id as number
    } else {
      const { data: inserted, error: insertErr } = await serviceSupabase
        .from('buoy_group')
        .insert({
          res_date: owRow.res_date,
          time_period: timePeriod,
          buoy_name: body.buoy_id,
          open_water_type: owRow.open_water_type ?? null,
        })
        .select('id')
        .single()

      if (insertErr || !inserted) {
        console.error('[openwater-move-buoy] Failed to create buoy_group', insertErr?.message)
        return json({ error: insertErr?.message || 'Failed to create buoy group' }, { status: 400 })
      }

      console.log('[openwater-move-buoy] Created new buoy_group', {
        group_id: inserted.id,
      })
      targetGroupId = inserted.id as number
    }

    // Update the reservation to point at the new group and persist preferred buoy
    console.info('[openwater-move-buoy] Updating res_openwater group_id & buoy', {
      reservation_id: body.reservation_id,
      group_id: targetGroupId,
      buoy: body.buoy_id,
    })
    const { error: updateErr } = await serviceSupabase
      .from('res_openwater')
      .update({ group_id: targetGroupId, buoy: body.buoy_id })
      .eq('uid', body.reservation_id);

    if (updateErr) {
      console.error('[openwater-move-buoy] Error updating res_openwater group_id', updateErr.message)
      return json({ error: updateErr.message }, { status: 400 })
    }

    // Verify the updated row
    const { data: verifyRow, error: verifyErr } = await serviceSupabase
      .from('res_openwater')
      .select('uid, res_date, time_period, group_id, buoy')
      .eq('uid', body.reservation_id)
      .maybeSingle()

    if (verifyErr) {
      console.error('[openwater-move-buoy] Error verifying updated res_openwater row', verifyErr.message)
    } else {
      console.log('[openwater-move-buoy] Verified updated res_openwater row', verifyRow)
    }

    // Refresh boat counts for affected groups (best-effort only)
    if (currentGroupId && currentGroupId !== targetGroupId) {
      const { error: refreshOldErr } = await serviceSupabase.rpc('refresh_boat_count', {
        p_group_id: currentGroupId,
      })
      if (refreshOldErr) {
        console.error('Failed to refresh boat count for old group', refreshOldErr.message)
      }
    }

    const { error: refreshNewErr } = await serviceSupabase.rpc('refresh_boat_count', {
      p_group_id: targetGroupId,
    })
    if (refreshNewErr) {
      console.error('Failed to refresh boat count for new group', refreshNewErr.message)
    }

    return json({ ok: true, group_id: targetGroupId }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
