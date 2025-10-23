import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database.types';

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey ? 'present' : 'missing'
  });
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper: retry a PostgREST call once if the JWT has expired.
// Usage:
//   const { data, error } = await withAuthRetry(() =>
//     supabase.from('user_profiles').select('uid').eq('uid', uid).single()
//   );
export async function withAuthRetry<T>(
  run: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> {
  const attempt = async () => {
    try {
      return await run();
    } catch (e) {
      // Some callers may throw instead of returning error
      return { data: null as T | null, error: e };
    }
  };

  let { data, error } = await attempt();
  const code = error?.code ?? error?.status ?? error?.name;
  const isExpired =
    error?.message === 'JWT expired' || code === 'PGRST303' || error?.status === 401;

  if (isExpired) {
    try {
      await supabase.auth.refreshSession();
      // retry once
      const res2 = await attempt();
      data = res2.data;
      error = res2.error;
    } catch (refreshErr) {
      error = error ?? refreshErr;
    }
  }

  return { data, error };
}

