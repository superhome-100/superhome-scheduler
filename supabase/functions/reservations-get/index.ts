// Supabase Edge Function: reservations-get
// - Owner or admin fetch reservations
// - Supports filters and single fetch

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type ReservationType = 'pool' | 'open_water' | 'classroom'
 type ReservationStatus = 'pending' | 'confirmed' | 'rejected'

interface Payload {
  uid?: string
  res_type?: ReservationType
  res_status?: ReservationStatus
  start_date?: string
  end_date?: string
  include_details?: boolean
  order_by?: 'res_date' | 'created_at' | 'updated_at'
  order_direction?: 'asc' | 'desc'
  limit?: number
  offset?: number
  single?: { uid: string; res_date: string } | null
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

    const body = (await req.json()) as Payload

    // Owner or admin check for specific uid or single
    const targetUid = body.single?.uid || body.uid || user.id
    if (targetUid !== user.id) {
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('privileges')
        .eq('uid', user.id)
        .single()
      if (profileErr) return json({ error: profileErr.message }, { status: 403 })
      const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
      if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })
    }

    let query = supabase
      .from('reservations')
      .select(body.include_details ? `*, res_pool!left(*), res_openwater!left(*), res_classroom!left(*)` : `*`)

    if (body.single) {
      query = query.eq('uid', body.single.uid).eq('res_date', body.single.res_date)
      const { data, error } = await (query as any).single()
      if (error) return json({ error: error.message }, { status: 400 })
      return json(data, { status: 200 })
    }

    if (body.uid) query = query.eq('uid', body.uid)
    if (body.res_type) query = query.eq('res_type', body.res_type)
    if (body.res_status) query = query.eq('res_status', body.res_status)
    if (body.start_date) query = query.gte('res_date', body.start_date)
    if (body.end_date) query = query.lte('res_date', body.end_date)

    const orderBy = body.order_by || 'res_date'
    const ascending = (body.order_direction || 'asc') === 'asc'
    query = query.order(orderBy as any, { ascending })

    if (body.limit) query = query.limit(body.limit)
    if (body.offset) query = query.range(body.offset, (body.offset + (body.limit || 10)) - 1)

    const { data, error } = await query
    if (error) return json({ error: error.message }, { status: 400 })

    return json(data || [], { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
