// Supabase Edge Function: get-my-buoy-assignment
// - Authenticated caller; allowed if admin or owner
// - Returns { buoy_name, boat } for a given res_date + time_period for the caller (or specified uid if admin)
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

type TimePeriod = 'AM' | 'PM'

interface Payload {
  res_date: string // 'YYYY-MM-DD'
  time_period: TimePeriod
  uid?: string // optional; admin may specify a uid, otherwise defaults to caller
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
    if (!body?.res_date || !body?.time_period) return json({ error: 'Invalid payload' }, { status: 400 })

    // Determine target uid: caller or specified (admin only)
    let targetUid = user.id

    if (body.uid && body.uid !== user.id) {
      // Admin check if querying other user's assignment
      const { data: profile, error: profileErr } = await supabase
        .from('user_profiles')
        .select('privileges')
        .eq('uid', user.id)
        .single()
      if (profileErr) return json({ error: profileErr.message }, { status: 403 })
      const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
      if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })
      targetUid = body.uid
    }

    // Query buoy_group joined with members to check assignment for the user
    // Prefer normalized table buoy_group_members if exists, otherwise fallback to res_openwater join if needed
    // Here we first try via buoy_group_members for strictness

    // 1) Try via members table
    const { data: viaMembers, error: memErr } = await supabase
      .from('buoy_group')
      .select('time_period, buoy_name, boat, buoy_group_members!inner(uid)')
      .eq('res_date', body.res_date)
      .eq('time_period', body.time_period)
      .eq('buoy_group_members.uid', targetUid)
      .maybeSingle()

    if (memErr) return json({ error: memErr.message }, { status: 500 })

    if (viaMembers) {
      const result = {
        buoy_name: (viaMembers as any).buoy_name ?? null,
        boat: (viaMembers as any).boat ?? null
      }
      return json(result, { status: 200 })
    }

    // 2) Fallback via res_openwater link (if members table not populated)
    const { data: viaOW, error: owErr } = await supabase
      .from('buoy_group')
      .select('time_period, buoy_name, boat, res_openwater!inner(uid)')
      .eq('res_date', body.res_date)
      .eq('time_period', body.time_period)
      .eq('res_openwater.uid', targetUid)
      .maybeSingle()

    if (owErr) return json({ error: owErr.message }, { status: 500 })

    if (!viaOW) return json({ buoy_name: null, boat: null }, { status: 200 })

    const result = {
      buoy_name: (viaOW as any).buoy_name ?? null,
      boat: (viaOW as any).boat ?? null
    }
    return json(result, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
