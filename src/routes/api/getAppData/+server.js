import { json } from '@sveltejs/kit';
import { getReservationsSince, getUserActiveNotifications } from '$lib/server/server.js';

import { getAllUsers } from '../../../lib/server/user';

export async function POST({ request }) {
	try {
		let { user, minDateStr } = await request.json();
		let notifications = await getUserActiveNotifications(user);
		const reservations = await getReservationsSince(minDateStr);
		const users = await getAllUsers();
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
