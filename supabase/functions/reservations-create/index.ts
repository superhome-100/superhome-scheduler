// Supabase Edge Function: reservations-create
// - Owner or admin can create reservations
// - Creates parent reservation and type-specific detail; rolls back on failure

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type ReservationType = 'pool' | 'open_water' | 'classroom'

type PoolDetails = { start_time: string | null; end_time: string | null; lane?: string | null; note?: string | null }
 type ClassroomDetails = { start_time: string | null; end_time: string | null; room?: string | null; note?: string | null }
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Payload
    if (!body?.uid || !body?.res_type || !body?.res_date) return json({ error: 'Invalid payload' }, { status: 400 })

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
