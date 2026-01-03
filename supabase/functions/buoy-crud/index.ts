import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'
import { corsHeaders, handlePreflight } from '../_shared/cors.ts'

interface BuoyRequest {
  action: 'create' | 'update' | 'delete' | 'get';
  buoy_name: string;
  new_buoy_name?: string;
  max_depth?: number;
  pulley?: boolean;
  bottom_plate?: boolean;
  large_buoy?: boolean;
  deep_fim_training?: boolean;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json', ...corsHeaders, ...(init.headers || {}) },
    ...init
  })
}

Deno.serve(async (req: Request) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('Auth error - verify JWT:', userError);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`Request from user: ${user.id} (${user.email})`);

    const { data: profile, error: profileErr } = await supabaseUser
      .from('user_profiles')
      .select('privileges')
      .eq('uid', user.id)
      .single();

    if (profileErr) {
      console.error('Profile fetch error:', profileErr);
      return json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    if (!profile?.privileges?.includes('admin')) {
      console.warn(`User ${user.id} (${user.email}) is not an admin. Privileges:`, profile?.privileges);
      return json({ error: 'Admin privileges required' }, { status: 403 });
    }

    const body: BuoyRequest = await req.json();
    const { action, buoy_name } = body;
    console.log(`Buoy CRUD: ${action} - ${buoy_name}`, body);

    switch (action) {
      case 'create': {
        if (!buoy_name) return json({ error: 'buoy_name is required' }, { status: 400 });
        
        const insertData = {
          buoy_name,
          max_depth: Math.max(1, Number(body.max_depth || 1)), // Ensure > 0 for constraint
          pulley: !!body.pulley,
          bottom_plate: !!body.bottom_plate,
          large_buoy: !!body.large_buoy,
          deep_fim_training: !!body.deep_fim_training,
        };

        const { data, error } = await supabaseService
          .from('buoy')
          .insert(insertData)
          .select('*')
          .single();

        if (error) {
          console.error('Create error:', error);
          return json({ error: error.message }, { status: 400 });
        }
        return json({ data });
      }

      case 'update': {
        if (!buoy_name) return json({ error: 'buoy_name is required' }, { status: 400 });
        
        const updateData: Record<string, unknown> = {};
        if (body.new_buoy_name) updateData.buoy_name = body.new_buoy_name;
        if (body.max_depth !== undefined) updateData.max_depth = Math.max(1, Number(body.max_depth));
        if (body.pulley !== undefined) updateData.pulley = !!body.pulley;
        if (body.bottom_plate !== undefined) updateData.bottom_plate = !!body.bottom_plate;
        if (body.large_buoy !== undefined) updateData.large_buoy = !!body.large_buoy;
        if (body.deep_fim_training !== undefined) updateData.deep_fim_training = !!body.deep_fim_training;

        if (Object.keys(updateData).length === 0) return json({ message: 'No changes' });

        const { data, error } = await supabaseService
          .from('buoy')
          .update(updateData)
          .eq('buoy_name', buoy_name)
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('Update error:', error);
          return json({ error: error.message }, { status: 400 });
        }
        return json({ data });
      }

      case 'delete': {
        if (!buoy_name) return json({ error: 'buoy_name is required' }, { status: 400 });
        const { error } = await supabaseService.from('buoy').delete().eq('buoy_name', buoy_name);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ success: true });
      }

      case 'get': {
        const { data, error } = await supabaseUser.from('buoy').select('*').order('buoy_name');
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ data });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal server error';
    console.error('buoy-crud crash:', msg);
    return json({ error: msg }, { status: 500 });
  }
});
