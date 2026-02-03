import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseServiceRole, checkAuthorisation } from '$lib/server/supabase';
import dayjs, { type Dayjs } from 'dayjs';
import { ow_am_full } from '$lib/firestore';

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

		const startStr = dayjs(startDate).format('YYYY-MM-DD')
		const endStr = dayjs(endDate).format('YYYY-MM-DD')

		const { data: reservations } = await supabaseServiceRole
			.from('ReservationsReport')
			.select('*')
			.gte('date', startStr)
			.lte('date', endStr)
			.throwOnError()

		const { data: daySettings } = await supabaseServiceRole
			.from('DaySettings')
			.select('date, value')
			.gte('date', startStr)
			.lte('date', endStr)
			.eq('key', ow_am_full)
			.throwOnError()

		const summary: Record<string, DateReservationSummary> = {};

		for (const date of dateArray) {
			summary[date] = {
				pool: 0,
				openwater: {
					AM: 0,
					PM: 0,
					total: 0,
					ow_am_full: false
				},
				classroom: 0,
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

		for (const daySetting of daySettings) {
			summary[daySetting.date].openwater.ow_am_full = daySetting.value === true;
		}

		return json({ status: 'success', summary });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
