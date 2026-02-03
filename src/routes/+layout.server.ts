import type { LayoutServerLoad } from './$types';

// locals: from hooks.server.ts
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	console.log('[layout.server] load called');
	const { session, user } = await locals.safeGetSession();

	return {
		settings: locals.settings.getSettings(),
		session,
		user,
		cookies: cookies.getAll()
	}; // available in +layouts.ts
};
