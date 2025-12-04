import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

type ReservationCategory = 'pool' | 'open_water' | 'classroom';

interface AvailabilityCheckRequest {
  date: string; // YYYY-MM-DD or ISO
  // Updated schema: prefer category/type; keep res_type for backward compatibility
  category?: ReservationCategory;
  type?: string | null;
  res_type?: ReservationCategory; // legacy
  start_time?: string; // HH:mm or HH:mm:ss
  end_time?: string;   // HH:mm or HH:mm:ss
}

serve(async (req) => {
  // Handle CORS
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    // Create Supabase client (RLS-bound)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    // Service role client for internal capacity checks (bypass RLS)
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AvailabilityCheckRequest = await req.json();
    const date = body?.date;
    const category: ReservationCategory | undefined = body?.category ?? body?.res_type;
    const subType: string | null | undefined = body?.type;
    const start_time = body?.start_time;
    const end_time = body?.end_time;

    if (!date || !category) {
      return new Response(
        JSON.stringify({ error: 'Date and category are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch overrides for the date and category; evaluate specific vs generic
    const dateOnly = date.split('T')[0];
    const { data, error } = await supabaseClient
      .from('availabilities')
      .select('available, reason, type')
      .eq('date', dateOnly)
      .eq('category', category);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isAvailable = true;
    let reason: string | null = null;
    let hasOverride = false;

    if (data && data.length > 0) {
      const specific = subType ? data.find((row: any) => row.type === subType) : null;
      const generic = data.find((row: any) => row.type === null);
      const override = specific ?? generic;
      if (override) {
        isAvailable = !!override.available;
        reason = override.reason || null;
        hasOverride = true;
      }
    }

    // Capacity check for classroom when start/end provided
    if (category === 'classroom' && start_time && end_time) {
      // Compute overlapping count from reservations for that calendar day
      const from = `${dateOnly} 00:00:00+00`;
      const to = `${dateOnly} 23:59:59+00`;
      const { data: overlaps, error: overErr } = await serviceClient
        .from('reservations')
        .select(`res_status, res_classroom(start_time, end_time)`)  // room not needed for count
        .eq('res_type', 'classroom')
        .gte('res_date', from)
        .lte('res_date', to)
        .in('res_status', ['pending', 'confirmed']);
      if (!overErr) {
        const toMin = (raw: string) => {
          const m = raw.match(/^(\d{2}):(\d{2})/);
          if (!m) return NaN;
          return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
        };
        const sUser = toMin(start_time);
        const eUser = toMin(end_time);
        const overlapsCount = (overlaps || []).reduce((acc: number, r: any) => {
          const s = r?.res_classroom?.start_time as string | undefined;
          const e = r?.res_classroom?.end_time as string | undefined;
          if (!s || !e) return acc;
          const sDb = toMin(s);
          const eDb = toMin(e);
          if (Number.isNaN(sDb) || Number.isNaN(eDb) || Number.isNaN(sUser) || Number.isNaN(eUser)) return acc;
          return sDb < eUser && eDb > sUser ? acc + 1 : acc;
        }, 0);
        const CAPACITY = 3; // TODO: replace with settings-backed capacity
        const capOk = overlapsCount < CAPACITY;
        if (!capOk) {
          isAvailable = false;
          reason = reason ?? 'No classrooms available for the selected time window';
        }
      }
    }

    const result = { isAvailable, reason, hasOverride };

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in availability-check function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
