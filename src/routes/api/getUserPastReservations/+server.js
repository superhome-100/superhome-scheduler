import { json } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata';

const xata = getXataClient();

export async function POST({ request }) {
	try {
		let { user, maxDateStr } = await request.json();
		let userPastReservations = await xata.db.Reservations.filter({
			user,
			date: { $le: maxDateStr },
			status: 'confirmed'
		}).getAll();
		return json({ status: 'success', userPastReservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
