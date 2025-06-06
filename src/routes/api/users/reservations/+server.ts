import { json } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';

import dayjs, { Dayjs } from 'dayjs';
import tz from 'dayjs/plugin/timezone';
dayjs.extend(tz);

const xata = getXataClient();

const daysLimit = 60;
export async function GET({ request }: { request: Request }) {
	try {
		const now = dayjs().tz('Asia/Manila');
		const inXDays = now.clone().add(daysLimit, 'days');

		const dateArray = [];
		let currentDate: Dayjs = now;

		while (currentDate.isBefore(inXDays)) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}
		const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
		const rawRsvs = await xata.db.Reservations.filter({
			// @ts-ignore
			user: xataUser.id,
			date: { $any: dateArray },
			status: { $any: ['confirmed', 'pending'] }
		}).getAll();
		const reservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', reservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
