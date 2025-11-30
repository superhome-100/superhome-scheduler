// Supabase Edge Function: user-update-status
// - Admin-only update of user_profiles.status
// - Deno runtime (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

type Status = 'active' | 'disabled' | string

interface Payload {
  uid: string
  status: Status
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
    // Cast to any[] to avoid runtime issues if the type is not inferred as string[]
    const isAdmin = Array.isArray(profile?.privileges) && (profile!.privileges as any[]).includes('admin')
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as Payload
    if (!body || typeof body.uid !== 'string' || typeof body.status !== 'string') {
      return json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Strictly validate status against enum to prevent DB enum errors (e.g., "inactive")
    const allowed: Status[] = ['active', 'disabled']
    if (!allowed.includes(body.status as Status)) {
      return json({ error: 'Invalid status value. Must be "active" or "disabled"' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('uid', body.uid)

    if (error) return json({ error: error.message }, { status: 500 })

    return json({ ok: true }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
