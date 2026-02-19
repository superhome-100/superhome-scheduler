import { json } from '@sveltejs/kit';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';

import dayjs, { type Dayjs } from 'dayjs';
import tz from 'dayjs/plugin/timezone';
import { ReservationStatus } from '$types';
dayjs.extend(tz);

/**
 * @deprecated unused, direct access to supabase now
 */
export async function GET({ locals: { safeGetSession } }) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user);

		const daysLimit = 60;
		const now = dayjs().tz('Asia/Manila');
		const inXDays = now.clone().add(daysLimit, 'days');

		const dateArray = [];
		let currentDate: Dayjs = now;

		while (currentDate.isBefore(inXDays)) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const { data: rawRsvs } = await supabaseServiceRole
			.from('Reservations')
			.select('*')
			.eq('user', user.id)
			.gte('date', now.format('YYYY-MM-DD'))
			.lt('date', inXDays.format('YYYY-MM-DD'))
			.in("status", [ReservationStatus.confirmed, ReservationStatus.pending])
			.throwOnError();

		const reservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', reservations });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
