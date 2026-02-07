import { getUserActiveNotifications } from '$lib/server/server';
import { json, type RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';
import { console_error } from '$lib/server/sentry';

/**
 * @deprecated unused, direct access to supabase now
 */
export async function GET({ locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);
		const notifications = await getUserActiveNotifications(user.id);
		return json({ status: 'success', notifications });
	} catch (error) {
		console_error('Error in notifications', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
