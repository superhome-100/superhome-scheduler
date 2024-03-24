import { json } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';

const xata = getXataClient();

export async function POST({ request }) {
	try {
		const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
		let { maxDateStr } = await request.json();
		let rawRsvs = await xata.db.Reservations.filter({
			user: xataUser.id,
			date: { $le: maxDateStr },
			status: 'confirmed'
		}).getAll();
		let userPastReservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', userPastReservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
