import { json } from '@sveltejs/kit';
import { getReservationsSince } from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

export async function POST() {
    const oneWeekAgo = () => {
        let now = new Date();
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }
    const reservations = await getReservationsSince(oneWeekAgo());
    return json(reservations);
}
