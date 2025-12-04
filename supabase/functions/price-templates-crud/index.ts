import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface PTRequest {
  action: 'create' | 'update' | 'delete' | 'get';
  id?: string;
  price_template_name?: string;
  coach_ow?: number;
  coach_pool?: number;
  coach_classroom?: number;
  auto_ow?: number;
  auto_pool?: number;
  platform_ow?: number;
  platformcbs_ow?: number;
}

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Client bound to the caller's auth for identity/admin checks
    const supabaseUser = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Privileged client for mutations (bypass RLS as per project rules)
    const supabaseService = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      // No user Authorization header here, use service role
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Require admin
    const { data: profile } = await supabaseUser
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single();

    if (!profile?.privileges?.includes('admin')) {
      return new Response(JSON.stringify({ error: 'Admin privileges required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body: PTRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const { price_template_name } = body;
        if (!price_template_name) {
          return new Response(JSON.stringify({ error: 'price_template_name is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        // Generate id on server
        const id = crypto.randomUUID();

        // Ensure the referenced template exists (FK -> price_templates.name)
        {
          const { error: upsertTplErr } = await supabaseService
            .from('price_templates')
            .upsert({ name: price_template_name, description: null }, { onConflict: 'name', ignoreDuplicates: true });
          if (upsertTplErr) {
            return new Response(JSON.stringify({ error: upsertTplErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        const insertData = {
          id,
          price_template_name,
          coach_ow: body.coach_ow ?? 0,
          coach_pool: body.coach_pool ?? 0,
          coach_classroom: body.coach_classroom ?? 0,
          auto_ow: body.auto_ow ?? 0,
          auto_pool: body.auto_pool ?? 0,
          platform_ow: body.platform_ow ?? 0,
          platformcbs_ow: body.platformcbs_ow ?? 0
        };
        const { data, error } = await supabaseService
          .from('price_template_updates')
          .insert(insertData)
          .select('*')
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'update': {
        const { id } = body;
        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required for update' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const updateData: Record<string, unknown> = {};
        const keys: (keyof PTRequest)[] = ['price_template_name','coach_ow','coach_pool','coach_classroom','auto_ow','auto_pool','platform_ow','platformcbs_ow'];
        for (const k of keys) {
          if (body[k] !== undefined) updateData[k] = body[k] as any;
        }
        // Ensure parent template exists if name is being changed/provided
        if (typeof body.price_template_name === 'string' && body.price_template_name.trim().length > 0) {
          const { error: upsertTplErr } = await supabaseService
            .from('price_templates')
            .upsert({ name: body.price_template_name, description: null }, { onConflict: 'name', ignoreDuplicates: true });
          if (upsertTplErr) {
            return new Response(JSON.stringify({ error: upsertTplErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }
        const { data, error } = await supabaseService
          .from('price_template_updates')
          .update(updateData)
          .eq('id', id)
          .select('*')
          .single();
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'delete': {
        const { id } = body;
        if (!id) {
          return new Response(JSON.stringify({ error: 'id is required for delete' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const { error } = await supabaseService
          .from('price_template_updates')
          .delete()
          .eq('id', id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'get': {
        const { data, error } = await supabaseUser
          .from('price_template_updates')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ data }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      default: {
        return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
  } catch (e) {
    console.error('price-templates-crud error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
