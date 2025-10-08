# Supabase-First Migration (No SvelteKit Server Routes)

This app now uses the Supabase platform directly from the SvelteKit frontend for all CRUD and custom workflows:

- Database access via the Supabase JavaScript client (`supabase.from('table')...`).
- Custom workflows run as Supabase Edge Functions and are invoked from the client (`supabase.functions.invoke`).
- Authentication and authorization are enforced by Supabase Auth and Row‑Level Security policies. The client sends the Supabase Auth JWT with every request automatically.

## Environment Variables

Create `app/.env.local` from `app/.env.example` with your project credentials:

```
VITE_PUBLIC_SUPABASE_URL=... 
VITE_PUBLIC_SUPABASE_ANON_KEY=...
```

These are read in `app/src/lib/utils/supabase.ts`.

## Removed/Deprecated SvelteKit Backend

- `app/src/hooks.server.ts`: now a pass‑through; no server-side Supabase wiring.
- `app/src/routes/+layout.server.ts`: returns empty data; session is not provided on SSR.
- `app/src/routes/api/reservations/+server.ts`: returns HTTP 410 Gone. Use the Supabase client or Edge Functions instead.

## Edge Functions

A new Edge Function handles bulk reservation status updates with admin checks:

- Source: `supabase/functions/reservations-bulk-status/index.ts`
- Frontend helper: `app/src/lib/utils/functions.ts`
- Frontend usage: `reservationService.bulkUpdateStatus()` now calls this function.

### Deploy

Install the Supabase CLI and log in, then run:

```
supabase functions deploy reservations-bulk-status
```

To test locally:

```
supabase functions serve reservations-bulk-status
```

The Supabase client automatically forwards the user's auth token to the function. RLS remains in effect.

## Notes

- Keep RLS policies strict; the Edge Function checks `user_profiles.privileges` for `admin` before applying updates.
- No realtime: use the app's pull‑to‑refresh UI to refresh data.
- Keep file sizes under 300 lines and use reusable models/stores.
