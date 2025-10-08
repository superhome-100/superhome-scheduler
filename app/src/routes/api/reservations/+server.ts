import type { RequestHandler } from '@sveltejs/kit';

// This route is deprecated. All CRUD is now performed directly against Supabase REST
// from the client using the Supabase JS client, and custom workflows run on Supabase Edge Functions.
// Returning 410 Gone to signal callers to migrate.

const gone = (hint: string) =>
  new Response(
    JSON.stringify({ error: 'Deprecated. Use Supabase client/Edge Functions instead.', hint }),
    { status: 410, headers: { 'content-type': 'application/json' } }
  );

export const GET: RequestHandler = async () => gone('Query with supabase.from(...) on the client');
export const POST: RequestHandler = async () => gone('Insert with supabase.from(...).insert on the client');
export const PUT: RequestHandler = async () => gone('Update with supabase.from(...).update on the client');
export const PATCH: RequestHandler = async () => gone('Update with supabase.from(...).update on the client');
export const DELETE: RequestHandler = async () => gone('Delete with supabase.from(...).delete on the client');
