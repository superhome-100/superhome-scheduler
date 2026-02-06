import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus } from '$types';

interface RequestBody {
	maxDateStr: string;
}

/**
 * @deprecated unused, direct access to supabase now
 */
export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const { maxDateStr } = (await request.json()) as RequestBody;
		const { data: rawRsvs } = await supabaseServiceRole
			.from('Reservations')
			.select('*')
			.eq('user', user.id)
			.lte('date', maxDateStr)
			.eq('status', ReservationStatus.confirmed)
			.throwOnError();

		const userPastReservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', userPastReservations });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({ status: 'error', error });
	}
}
