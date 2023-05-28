import { json } from '@sveltejs/kit';
import { getUserActiveNotifications } from '$lib/server/server.js';
import { getReservationsSince } from '$lib/server/reservation';
import { getAllUsers } from '../../../lib/server/user';

export async function POST({ request }) {
	try {
		let { user, minDateStr } = await request.json();
		const [notifications, reservations, users] = await Promise.all([
			getUserActiveNotifications(user),
			getReservationsSince(minDateStr),
			getAllUsers()
		]);

		const usersById = users.reduce((obj, user) => {
			obj[user.id] = user;
			return obj;
		}, {});
		return json({
			status: 'success',
			notifications,
			reservations,
			usersById
		});
	} catch (error) {
		return json({ status: 'error', error });
	}
}
