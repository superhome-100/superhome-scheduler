import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';
import { getXataClient } from '$lib/server/xata-old';
import { json, RequestEvent } from '@sveltejs/kit';
import dayjs, { Dayjs } from 'dayjs';

import type { DateReservationSummary } from '$types';

const xata = getXataClient();

export async function GET({ request, url }: RequestEvent) {
	try {
		const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
		if (!xataUser) throw new Error('User not allowed to access this resource');

		const queryParams = url.searchParams;
		const startDate = queryParams.get('startDate');
		const endDate = queryParams.get('endDate');

		const dateArray = [];
		let currentDate: Dayjs = dayjs(startDate);

		while (currentDate.isBefore(dayjs(endDate))) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const reservations = await xata.db.Reservations.filter({
			date: {
				$any: dateArray
			},
			status: {
				$any: ['confirmed', 'pending']
			}
		})
			.select(['date', 'category', 'owTime', 'status', 'resType', 'numStudents'])
			.getAll();

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
			const date = reservation.date;
			const category = reservation.category;
			const owTime = reservation.owTime;
			if (!date) continue;

			const day = summary[date];
			if (!day) continue;

			const count = (reservation.numStudents || 0) + 1;
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
