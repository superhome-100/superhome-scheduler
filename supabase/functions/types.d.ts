// Local TypeScript declarations to improve IDE support for Supabase Edge Functions (Deno runtime)
// These are ONLY for editor tooling and do not affect runtime on Supabase.

// Map the ESM import to the installed @supabase/supabase-js types so the TS server can resolve it locally.
declare module 'https://esm.sh/@supabase/supabase-js@2.45.4' {
  import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js'
  export { createClient, SupabaseClient, User, Session }
  export * from '@supabase/supabase-js'
}

// Deno global typings for Supabase Edge Functions
declare global {
  const Deno: {
    env: {
      get(key: string): string | undefined
    }
    serve: (
      handler: (req: Request) => Response | Promise<Response>
    ) => void
  }
}

// Make this a module
export {}
