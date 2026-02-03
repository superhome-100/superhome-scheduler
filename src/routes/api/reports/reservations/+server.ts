import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseServiceRole, checkAuthorisation } from '$lib/server/supabase';
import dayjs, { type Dayjs } from 'dayjs';

import type { DateReservationSummary } from '$types';

export async function GET({ url, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const queryParams = url.searchParams;
		const startDate = queryParams.get('startDate');
		const endDate = queryParams.get('endDate');

		const dateArray = [];
		let currentDate: Dayjs = dayjs(startDate);

		while (currentDate.isBefore(dayjs(endDate).add(1, 'day'))) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const reservationsResponse = await supabaseServiceRole
			.from('ReservationsReport')
			.select('*')
			.gte('date', dayjs(startDate).format('YYYY-MM-DD'))
			.lte('date', dayjs(endDate).format('YYYY-MM-DD'))
		if (reservationsResponse.error) {
			throw Error(`${reservationsResponse}`);
		}
		const reservations = reservationsResponse.data;

		const summary: Record<string, DateReservationSummary> = {};

		for (const date of dateArray) {
			summary[date] = {
				pool: 0,
				openwater: {
					AM: 0,
					PM: 0,
					total: 0
				},
				classroom: 0
			};
		}

		for (const reservation of reservations) {
			const date = reservation.date!;
			const category = reservation.category!;
			const owTime = reservation.owTime;
			const count = reservation.count!;
			if (!date) continue;

			const day = summary[date];
			if (!day) continue;

			if (category === 'pool') {
				day.pool += count;
			} else if (category === 'classroom') {
				day.classroom += count;
			} else if (category === 'openwater') {
				if (owTime === 'AM') {
					day.openwater.AM += count;
				} else if (owTime === 'PM') {
					day.openwater.PM += count;
				}
				day.openwater.total += count;
			}
		}
		return json({ status: 'success', summary });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
