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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return json({ error: 'Server not configured' }, { status: 500 })
    }

    // User client for identification
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Service client for admin operations
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userRes } = await supabase.auth.getUser()
    const user = userRes?.user
    if (!user) {
      console.error('Auth error or user mismatch')
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Admin check using service client
    const { data: profile, error: profileErr } = await serviceSupabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()
    
    if (profileErr) {
      console.error('Profile fetch error:', profileErr)
      return json({ error: 'Failed to verify permissions' }, { status: 403 })
    }
    
    const isAdmin = Array.isArray(profile?.privileges) && (profile!.privileges as any[]).includes('admin')
    if (!isAdmin) {
      console.warn(`User ${user.id} attempted admin action without privileges`)
      return json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = (await req.json()) as Payload
    if (!body || typeof body.uid !== 'string' || typeof body.status !== 'string') {
      return json({ error: 'Invalid payload' }, { status: 400 })
    }

    // Strictly validate status against enum to prevent DB enum errors
    const allowed: Status[] = ['active', 'disabled']
    if (!allowed.includes(body.status as Status)) {
      return json({ error: 'Invalid status value. Must be "active" or "disabled"' }, { status: 400 })
    }

    const { error: updateError } = await serviceSupabase
      .from('user_profiles')
      .update({ status: body.status, updated_at: new Date().toISOString() })
      .eq('uid', body.uid)

    if (updateError) {
      console.error('Update error:', updateError)
      return json({ error: updateError.message }, { status: 500 })
    }

    return json({ ok: true }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    console.error('Edge Function crash:', message)
    return json({ error: message }, { status: 500 })
  }
})
