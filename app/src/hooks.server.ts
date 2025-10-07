import type { Handle } from '@sveltejs/kit';

// Server hooks are no longer used for Supabase session wiring.
// All auth happens client-side; requests carry the Supabase Auth token directly to Supabase.
export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
