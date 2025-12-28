import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handlePreflight } from '../_shared/cors.ts';

interface SettingsRequest {
  action: 'create' | 'update' | 'delete' | 'get';
  id?: string;
  settings_name?: string;
  reservationCutOffTimeOW?: string;
  cancelationCutOffTimeOW?: number;
  reservationCutOffTimePOOL?: number;
  cancelationCutOffTimePOOL?: number;
  reservationCutOffTimeCLASSROOM?: number;
  cancelationCutOffTimeCLASSROOM?: number;
  reservationLeadTimeDays?: number;
  maxChargeableOWPerMonth?: number;
  availablePoolSlots?: string;
  availableClassrooms?: string;
  poolLable?: string;
  classroomLable?: string;
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

    const body: SettingsRequest = await req.json();
    const { action } = body;

    switch (action) {
      case 'create': {
        const settings_name = body.settings_name || 'default';
        
        // Generate id on server
        const id = crypto.randomUUID();

        // Ensure the referenced settings exists (FK -> settings.name)
        {
          const { error: upsertTplErr } = await supabaseService
            .from('settings')
            .upsert({ name: settings_name }, { onConflict: 'name', ignoreDuplicates: true });
          if (upsertTplErr) {
            return new Response(JSON.stringify({ error: upsertTplErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        const insertData = {
          id,
          settings_name,
          reservationCutOffTimeOW: body.reservationCutOffTimeOW,
          cancelationCutOffTimeOW: body.cancelationCutOffTimeOW,
          reservationCutOffTimePOOL: body.reservationCutOffTimePOOL,
          cancelationCutOffTimePOOL: body.cancelationCutOffTimePOOL,
          reservationCutOffTimeCLASSROOM: body.reservationCutOffTimeCLASSROOM,
          cancelationCutOffTimeCLASSROOM: body.cancelationCutOffTimeCLASSROOM,
          reservationLeadTimeDays: body.reservationLeadTimeDays,
          maxChargeableOWPerMonth: body.maxChargeableOWPerMonth,
          availablePoolSlots: body.availablePoolSlots,
          availableClassrooms: body.availableClassrooms,
          poolLable: body.poolLable,
          classroomLable: body.classroomLable
        };
        const { data, error } = await supabaseService
          .from('settings_updates')
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
        const keys: (keyof SettingsRequest)[] = [
          'settings_name',
          'reservationCutOffTimeOW',
          'cancelationCutOffTimeOW',
          'reservationCutOffTimePOOL',
          'cancelationCutOffTimePOOL',
          'reservationCutOffTimeCLASSROOM',
          'cancelationCutOffTimeCLASSROOM',
          'reservationLeadTimeDays',
          'maxChargeableOWPerMonth',
          'availablePoolSlots',
          'availableClassrooms',
          'poolLable',
          'classroomLable'
        ];
        for (const k of keys) {
          if (body[k] !== undefined) updateData[k] = body[k] as any;
        }

        // Ensure parent settings exists if name is being changed/provided
        if (typeof body.settings_name === 'string' && body.settings_name.trim().length > 0) {
          const { error: upsertTplErr } = await supabaseService
            .from('settings')
            .upsert({ name: body.settings_name }, { onConflict: 'name', ignoreDuplicates: true });
          if (upsertTplErr) {
            return new Response(JSON.stringify({ error: upsertTplErr.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        }

        const { data, error } = await supabaseService
          .from('settings_updates')
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
          .from('settings_updates')
          .delete()
          .eq('id', id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      case 'get': {
        const { data, error } = await supabaseUser
          .from('settings_updates')
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
    console.error('settings-crud error', e);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
