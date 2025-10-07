// Supabase Edge Function: get-buoy-groups-with-names
// - Admin-only endpoint to fetch buoy groups and member names for a given date and time period
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

interface Payload {
  res_date: string // 'YYYY-MM-DD'
  time_period: string // 'AM' | 'PM' | etc
}

interface BuoyGroupWithNames {
  id: number
  res_date: string
  time_period: string
  buoy_name: string
  boat: string | null
  member_uids: string[] | null
  member_names: (string | null)[] | null
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

    // Auth and admin check
    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()

    if (profileErr) return json({ error: profileErr.message }, { status: 403 })
    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as Payload
    if (!body?.res_date || !body?.time_period) return json({ error: 'Invalid payload' }, { status: 400 })

    // Fetch groups
    const { data: groups, error: groupErr } = await supabase
      .from('buoy_group')
      .select('id, res_date, time_period, buoy_name, boat, buoy_group_members(uid)')
      .eq('res_date', body.res_date)
      .eq('time_period', body.time_period)
      .order('id', { ascending: true })

    if (groupErr) return json({ error: groupErr.message }, { status: 500 })

    const memberUids = new Set<string>()
    for (const g of groups || []) {
      const mems = ((g as any).buoy_group_members || []) as Array<{ uid: string }>
      mems.forEach(m => m?.uid && memberUids.add(m.uid))
    }

    const uids = Array.from(memberUids)
    let namesByUid = new Map<string, string | null>()

    if (uids.length) {
      const { data: profiles, error: namesErr } = await supabase
        .from('user_profiles')
        .select('uid, name')
        .in('uid', uids)

      if (namesErr) return json({ error: namesErr.message }, { status: 500 })

      for (const p of profiles || []) {
        namesByUid.set((p as any).uid, (p as any).name ?? null)
      }
    }

    const result: BuoyGroupWithNames[] = (groups || []).map((g: any) => {
      const uids = (g.buoy_group_members || []).map((m: any) => m.uid)
      const names = uids.map((u: string) => namesByUid.get(u) ?? null)
      return {
        id: g.id,
        res_date: g.res_date,
        time_period: g.time_period,
        buoy_name: g.buoy_name,
        boat: g.boat ?? null,
        member_uids: uids,
        member_names: names
      }
    })

    return json(result, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
