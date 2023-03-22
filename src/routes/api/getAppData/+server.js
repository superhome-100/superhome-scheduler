import { json } from '@sveltejs/kit';
import { getReservationsSince, getActiveUsers } from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';

export async function POST() {
    const oneWeekAgo = () => {
        let now = new Date();
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }
    const reservations = await getReservationsSince(oneWeekAgo());
    const users = await getActiveUsers();
    return json({ reservations, users });
}
