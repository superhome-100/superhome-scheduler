import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';
import { convertFromXataToAppType } from '$lib/server/reservation';
import { getXataUserDocWithFirebaseToken } from '$lib/server/firestore';

const xata = getXataClient();

interface RequestBody {
	maxDateStr: string;
}

export async function POST({ request }: RequestEvent) {
	try {
		const xataUser = await getXataUserDocWithFirebaseToken(request.headers);
		const { maxDateStr } = (await request.json()) as RequestBody;

		const rawRsvs = await xata.db.Reservations.filter({
			user: xataUser.id,
			date: { $le: maxDateStr },
			status: 'confirmed'
		}).getAll();

		const userPastReservations = await convertFromXataToAppType(rawRsvs);
		return json({ status: 'success', userPastReservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
