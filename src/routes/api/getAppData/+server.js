import { json } from '@sveltejs/kit';
import { getReservationsSince, getActiveUsers } from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

export async function GET() {
    const oneWeekAgo = () => {
        let now = new Date();
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }
    try {
        const reservations = await getReservationsSince(oneWeekAgo());
        const users = await getActiveUsers();
        const usersById = users.reduce((obj, user) => {
            obj[user.id] = user;
            return obj;
        }, {});
        return json({ status: 'success', reservations, usersById });
    } catch (error) {
        return json({ status: 'error', error });
    }
}
