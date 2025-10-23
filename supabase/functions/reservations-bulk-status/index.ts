// Supabase Edge Function: reservations-bulk-status
// - Validates caller is authenticated and has 'admin' privilege
// - Performs bulk status updates on reservations under RLS
// - When confirming, delegates to reservations-update to enforce auto-assign rules
// - Deno environment (TypeScript)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface Payload {
  reservations: Array<{ uid: string; res_date: string }>;
  status: 'pending' | 'confirmed' | 'rejected';
}

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  });
}

Deno.serve(async (req: Request) => {
  try {
    const pre = handlePreflight(req);
    if (pre) return pre;

    if (req.method !== 'POST') {
      return json({ error: 'Method Not Allowed' }, { status: 405 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

    // Check admin privilege via RLS-safe query
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single();

    if (profileErr) return json({ error: profileErr.message }, { status: 403 });

    const isAdmin = Array.isArray(profile?.privileges) && profile!.privileges.includes('admin');
    if (!isAdmin) return json({ error: 'Forbidden' }, { status: 403 });

    const body = (await req.json()) as Payload;
    if (!body?.reservations?.length || !body.status) {
      return json({ error: 'Invalid payload' }, { status: 400 });
    }

    let updated = 0;
    const errors: string[] = [];

    // Perform updates sequentially to respect RLS and apply per-item logic
    for (const r of body.reservations) {
      try {
        if (body.status === 'confirmed') {
          // Delegate to reservations-update so that auto-assign checks (pool lanes/classrooms) run
          const resp = await fetch(`${SUPABASE_URL}/functions/v1/reservations-update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: authHeader },
            body: JSON.stringify({
              uid: r.uid,
              res_date: r.res_date,
              parent: { res_status: 'confirmed' }
            })
          });

          if (!resp.ok) {
            const errTxt = await resp.text().catch(() => 'Unknown error');
            errors.push(`${r.uid}-${r.res_date}: ${errTxt}`);
            continue;
          }
          updated++;
        } else {
          // For non-confirm transitions, direct update is fine
          const { error } = await supabase
            .from('reservations')
            .update({ res_status: body.status, updated_at: new Date().toISOString() })
            .eq('uid', r.uid)
            .eq('res_date', r.res_date);

          if (error) {
            errors.push(`${r.uid}-${r.res_date}: ${error.message}`);
          } else {
            updated++;
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${r.uid}-${r.res_date}: ${msg}`);
      }
    }

    return json({ updated, errors: errors.length ? errors : undefined }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unexpected error';
    return json({ error: message }, { status: 500 });
  }
});
