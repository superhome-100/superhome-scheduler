import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';


/**
 * just for testing 
 */
export async function GET({ locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const result = await pushNotificationService.send(user, 'notification test');

		return json({ status: 'success', message: result.map(x => x.status) });
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error}` });
	}
}
