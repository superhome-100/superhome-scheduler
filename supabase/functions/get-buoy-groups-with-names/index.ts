// Supabase Edge Function: get-buoy-groups-with-names
/// <reference path="../types.d.ts" />
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
  // Added for client compatibility (SingleDayView expects this shape)
  res_openwater?: Array<{ uid: string }>
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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 })

    // Client bound to the caller's auth for user identity
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service client for admin-only data access (bypass RLS after we validate admin)
    const svc = SUPABASE_SERVICE_ROLE_KEY
      ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
      : null

    // Auth and admin check
    const { data: userRes } = await authClient.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile, error: profileErr } = await (svc ?? authClient)
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()

    if (profileErr) return json({ error: profileErr.message }, { status: 403 })
    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as Payload
    if (!body?.res_date || !body?.time_period) return json({ error: 'Invalid payload' }, { status: 400 })
    console.log('[get-buoy-groups-with-names] payload', body)

    // Use security-definer RPC to avoid RLS complexity and rely on is_admin() checks inside the function
    // IMPORTANT: Call the RPC with the AUTH-BOUND client so auth.uid() is present in Postgres.
    const { data: rpcRows, error: rpcErr } = await authClient
      .rpc('get_buoy_groups_with_names', {
        p_res_date: body.res_date,
        p_time_period: body.time_period
      })
    if (rpcErr) {
      console.error('[get-buoy-groups-with-names] RPC error', rpcErr)
      return json({ error: rpcErr.message }, { status: 500 })
    }

    const result: BuoyGroupWithNames[] = (rpcRows || []).map((g: any) => {
      const uids = (g.member_uids || []) as string[]
      const names = (g.member_names || []) as (string | null)[]
      return {
        id: g.id,
        res_date: g.res_date,
        time_period: g.time_period,
        buoy_name: g.buoy_name,
        boat: g.boat ?? null,
        member_uids: uids,
        member_names: names,
        res_openwater: uids.map((uid: string) => ({ uid }))
      }
    })

    return json(result, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('[get-buoy-groups-with-names] caught error', message)
    return json({ error: message }, { status: 500 })
  }
})
