import { getSettings } from '$lib/settings';
import type { LayoutServerLoad } from './$types';

// locals: from hooks.server.ts
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	console.log('[layout.server] load called');
	const { session, user } = await locals.safeGetSession();
	const settings = await getSettings(locals.supabase);

	// Security: Filter cookies to prevent leaking HttpOnly/non-Supabase cookies to the client payload
	const supabaseCookies = cookies.getAll().filter((cookie) => cookie.name.startsWith('sb-'));

	return {
		settings,
		session,
		user,
		supabaseCookies
	}; // available in +layouts.ts
};
