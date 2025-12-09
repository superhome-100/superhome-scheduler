// Supabase Edge Function: reservations-normalize-cancelled
// Purpose: Ensure cancelled reservations have price=0
// Safety:
// - Owners can normalize their own reservations (by uid + optional date range or ids that belong to them)
// - Admins can normalize any reservations
// CORS: uses shared _shared/cors.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

// Payload shapes
// Mode A: by uid/date range
// { mode: 'by_uid', uid: string, from?: string (YYYY-MM-DD), to?: string (YYYY-MM-DD) }
// Mode B: by reservation ids
// { mode: 'by_ids', reservation_ids: number[] }

type NormalizeByUid = { mode: 'by_uid'; uid: string; from?: string; to?: string }
type NormalizeByIds = { mode: 'by_ids'; reservation_ids: number[] }
type Payload = NormalizeByUid | NormalizeByIds

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req)
    if (pre) return pre

    if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 })

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return json({ error: 'Server not configured' }, { status: 500 })

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } })
    const admin = SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as Payload
    if (!body || (body.mode !== 'by_uid' && body.mode !== 'by_ids')) {
      return json({ error: 'Invalid payload: mode required' }, { status: 400 })
    }

    // Determine if current user is admin
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()
    if (profileErr) return json({ error: profileErr.message }, { status: 403 })
    const isAdmin = Array.isArray(profile?.privileges) && (profile!.privileges as string[]).includes('admin')

    if (body.mode === 'by_uid') {
      if (!body.uid) return json({ error: 'uid is required for mode by_uid' }, { status: 400 })
      if (!isAdmin && body.uid !== user.id) return json({ error: 'Forbidden' }, { status: 403 })

      const from = body.from ? `${body.from} 00:00:00+00` : undefined
      const to = body.to ? `${body.to} 23:59:59+00` : undefined

      let query = (admin || supabase)
        .from('reservations')
        .update({ price: 0 })
        .eq('uid', body.uid)
        .eq('res_status', 'cancelled')
        .neq('price', 0)
        .select('reservation_id')

      if (from) query = (query as any).gte('res_date', from)
      if (to) query = (query as any).lte('res_date', to)

      const { data: upd, error: updErr } = await query
      if (updErr) return json({ error: updErr.message }, { status: 400 })

      return json({ success: true, normalized: Array.isArray(upd) ? upd.length : 0 })
    }

    // mode === 'by_ids'
    if (!Array.isArray((body as NormalizeByIds).reservation_ids) || (body as NormalizeByIds).reservation_ids.length === 0) {
      return json({ error: 'reservation_ids required for mode by_ids' }, { status: 400 })
    }

    const ids = (body as NormalizeByIds).reservation_ids

    // If not admin, ensure all ids belong to current user
    if (!isAdmin) {
      const { data: ownRows, error: ownErr } = await supabase
        .from('reservations')
        .select('reservation_id')
        .eq('uid', user.id)
        .in('reservation_id', ids)
      if (ownErr) return json({ error: ownErr.message }, { status: 400 })
      const ownSet = new Set((ownRows || []).map((r: any) => r.reservation_id))
      const unauthorized = ids.filter(id => !ownSet.has(id))
      if (unauthorized.length > 0) return json({ error: 'Some reservation_ids do not belong to the current user' }, { status: 403 })
    }

    const { data: updByIds, error: updIdsErr } = await (admin || supabase)
      .from('reservations')
      .update({ price: 0 })
      .in('reservation_id', ids)
      .eq('res_status', 'cancelled')
      .neq('price', 0)
      .select('reservation_id')
    if (updIdsErr) return json({ error: updIdsErr.message }, { status: 400 })

    return json({ success: true, normalized: Array.isArray(updByIds) ? updByIds.length : 0 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: msg }, { status: 500 })
  }
})
