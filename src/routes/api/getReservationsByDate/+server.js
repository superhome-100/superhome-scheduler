import { json } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';

const xata = getXataClient();

export async function POST({ request }) {
	try {
		const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
		if (!xataUser || !xataUser.id) {
			return json({ status: 'error', error: 'User not found' });
		}

		const { date, category } = await request.json();
		const rawRsvs = await xata.db.Reservations.filter({
			date,
			category,
			status: {
				$any: ['confirmed', 'pending']
			}
		}).getAll();
		const reservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', reservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
