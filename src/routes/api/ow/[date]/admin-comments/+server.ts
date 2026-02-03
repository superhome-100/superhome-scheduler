import { getOWReservationAdminComments } from '$lib/server/ow';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET({ params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);
		const date = params['date'];
		if (!date) throw Error('date param is expected');
		const adminComments = await getOWReservationAdminComments(date);
		return json(adminComments);
	} catch (error) {
		console.error('error assignBuoysToBoats', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
