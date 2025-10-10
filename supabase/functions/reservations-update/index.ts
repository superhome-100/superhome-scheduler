// Supabase Edge Function: reservations-update
// - Owner or admin can update reservation parent fields and details
// - Triggers pairing via openwater-auto-pair when confirming open water

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

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
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    ...init
  })
}

Deno.serve(async (req: Request) => {
  try {
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
