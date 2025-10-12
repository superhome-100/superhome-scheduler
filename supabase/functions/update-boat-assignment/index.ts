// Supabase Edge Function: update-boat-assignment
// - Admin-only update of buoy_group.boat
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface Payload {
  group_id: number
  boat: string
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

Deno.serve(async (req: Request) => {
  try {
    // Handle CORS preflight
    const pre = handlePreflight(req)
    if (pre) return pre

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

    // Admin check
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()
    if (profileErr) return json({ error: profileErr.message }, { status: 403 })
    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin')
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as Payload
    if (!body?.group_id || !body?.boat) return json({ error: 'Invalid payload' }, { status: 400 })

    const { error } = await supabase
      .from('buoy_group')
      .update({ boat: body.boat })
      .eq('id', body.group_id)

    if (error) return json({ error: error.message }, { status: 500 })

    return json({ ok: true }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
