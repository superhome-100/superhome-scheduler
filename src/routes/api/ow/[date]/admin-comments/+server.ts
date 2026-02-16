import { getYYYYMMDD } from '$lib/datetimeUtils';
import { console_error } from '$lib/server/sentry';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { json, type RequestEvent } from '@sveltejs/kit';

/**
 * @deprecated unused, direct access to supabase now
 */
export async function GET({ params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);
		const date = params['date'];
		if (!date) throw Error('date param is expected');
		const { data: adminComments } = await supabaseServiceRole
			.from('BuoyGroupings')
			.select('*')
			.eq('date', getYYYYMMDD(date))
			.throwOnError();
		return json(adminComments);
	} catch (error) {
		console_error('error assignBuoysToBoats', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
