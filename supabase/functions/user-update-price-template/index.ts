// Supabase Edge Function: user-update-price-template
// - Admin-only update of user_profiles.price_template_name
// - Uses service role for write per project Edge Functions rule

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface Payload {
  uid: string
  price_template_name: string
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

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
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 })
    }

    // Caller-bound client for identity and admin checks
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })

    // Service client for privileged write (bypass RLS for CUD as per rules)
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: userRes } = await supabaseUser.auth.getUser()
    const user = userRes?.user
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 })

    // Admin check
    const { data: profile, error: profileErr } = await supabaseUser
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single()
    if (profileErr) return json({ error: profileErr.message }, { status: 403 })
    const isAdmin = Array.isArray(profile?.privileges) && (profile!.privileges as any[]).includes('admin')
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 })

    const body = (await req.json()) as Payload
    if (!body || typeof body.uid !== 'string' || typeof body.price_template_name !== 'string') {
      return json({ error: 'Invalid payload' }, { status: 400 })
    }

    const name = body.price_template_name.trim()
    if (!name) return json({ error: 'price_template_name is required' }, { status: 400 })

    // Validate template exists
    const { data: tpl, error: tplErr } = await supabaseUser
      .from('price_templates')
      .select('name')
      .eq('name', name)
      .single()
    if (tplErr || !tpl) return json({ error: 'Invalid price_template_name' }, { status: 400 })

    // Perform the update using service role
    const { error } = await supabaseService
      .from('user_profiles')
      .update({ price_template_name: name, updated_at: new Date().toISOString() })
      .eq('uid', body.uid)

    if (error) return json({ error: error.message }, { status: 500 })

    return json({ ok: true }, { status: 200 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return json({ error: message }, { status: 500 })
  }
})
