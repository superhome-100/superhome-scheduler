import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface AvailabilityRequest {
  action: 'create' | 'update' | 'delete' | 'get';
  id?: number;
  date?: string;
  // Updated schema: category = reservation_type enum, type = text
  category?: 'pool' | 'open_water' | 'classroom';
  type?: string | null;
  available?: boolean;
  reason?: string | null;
}

serve(async (req) => {
  // Handle CORS
  const pre = handlePreflight(req);
  if (pre) return pre;

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

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single();

    if (!profile?.privileges?.includes('admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin privileges required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, id, date, category, type, available, reason }: AvailabilityRequest = await req.json();

    switch (action) {
      case 'create':
        if (!date || !category) {
          return new Response(
            JSON.stringify({ error: 'Date and category are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data: createData, error: createError } = await supabaseClient
          .from('availabilities')
          .insert({
            date,
            category,
            type: type ?? null,
            available: available ?? true,
            reason: reason ?? null
          })
          .select()
          .single();

        if (createError) {
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data: createData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'update':
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID is required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const updateData: any = {};
        if (date !== undefined) updateData.date = date;
        if (category !== undefined) updateData.category = category;
        if (type !== undefined) updateData.type = type;
        if (available !== undefined) updateData.available = available;
        if (reason !== undefined) updateData.reason = reason;

        const { data: updateResult, error: updateError } = await supabaseClient
          .from('availabilities')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data: updateResult }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'delete':
        if (!id) {
          return new Response(
            JSON.stringify({ error: 'ID is required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: deleteError } = await supabaseClient
          .from('availabilities')
          .delete()
          .eq('id', id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: deleteError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'get':
        const { data: getData, error: getError } = await supabaseClient
          .from('availabilities')
          .select('*')
          .order('date', { ascending: true });

        if (getError) {
          return new Response(
            JSON.stringify({ error: getError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ data: getData }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in availability-manage function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
