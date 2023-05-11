import { json } from '@sveltejs/kit';
import {
    getReservationsSince,
    getUserActiveNotifications,
    getAllUsers
} from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

export async function POST({ request }) {
    const oneWeekAgo = () => {
        let now = new Date();
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }
    try {
        let { user } = await request.json();
        let notifications = await getUserActiveNotifications(user);
        const reservations = await getReservationsSince(oneWeekAgo());
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
