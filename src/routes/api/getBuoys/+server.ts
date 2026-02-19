import { getBuoys } from '$lib/server/server';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { RequestEvent, RequestHandler } from '@sveltejs/kit';

/**
 * @deprecated unused, direct access to supabase now
 */
export const GET: RequestHandler = async ({ locals: { safeGetSession } }: RequestEvent) => {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user);

		const buoys = await getBuoys();
		return json({ status: 'success', buoys });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
};
