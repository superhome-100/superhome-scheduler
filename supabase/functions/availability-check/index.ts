import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

type ReservationCategory = 'pool' | 'open_water' | 'classroom';

interface AvailabilityCheckRequest {
  date: string; // YYYY-MM-DD or ISO
  // Updated schema: prefer category/type; keep res_type for backward compatibility
  category?: ReservationCategory;
  type?: string | null;
  res_type?: ReservationCategory; // legacy
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
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
