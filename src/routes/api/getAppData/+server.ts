import { json, type RequestEvent } from '@sveltejs/kit';
import { getReservationsSince } from '$lib/server/reservation';
import { getAllUsers } from '../../../lib/server/user';

// TODO: break this apart into separate functions
export async function POST({ request }: RequestEvent) {
	try {
		let { minDateStr } = await request.json();
		const [reservations, users] = await Promise.all([
			getReservationsSince(minDateStr),
			getAllUsers()
		]);

		const usersById = users.reduce((obj, user) => {
			obj[user.id] = user;
			return obj;
		}, {} as { [uid: string]: any });

		return json({
			status: 'success',
			reservations,
			usersById
		});
	} catch (error) {
		return json({ status: 'error', error });
	}
}
