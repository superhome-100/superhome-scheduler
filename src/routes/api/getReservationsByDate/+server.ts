import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { supabaseServiceRole, checkAuthorisation, AuthError } from '$lib/server/supabase';
import dayjs from 'dayjs';
import { ReservationStatus } from '$types';

interface RequestData {
	date: string;
	category: string;
}

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const { date, category } = (await request.json()) as RequestData;
		const { data: rawRsvs } = await supabaseServiceRole
			.from('Reservations')
			.select('*, Users(nickname)')
			.eq('date', dayjs(date).format('YYYY-MM-DD'))
			.eq('category', category)
			.in('status', [ReservationStatus.confirmed, ReservationStatus.pending])
			.throwOnError();

		const reservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', reservations });
	} catch (error) {
		console.error('Error in getReservationsByDate', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({
			status: 'error',
			error: `Unknown error ${error}`
		});
	}
}
