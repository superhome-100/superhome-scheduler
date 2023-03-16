import { redirect } from '@sveltejs/kit';
import { getSession, getReservationsSince } from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

export async function load({ route, cookies })  {
    let user;
    let session = cookies.get('sessionid');
    if (session === undefined) {
        if (route.id !== '/') {
            throw redirect(307, '/');
        }
    } else {
        let record = await getSession(session);
        user = record.user;
        if (route.id === '/') {
            throw redirect(307, '/' + user.facebookId);
        }
    }

    const oneWeekAgo = () => {
        let now = new Date();
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }

    const reservations = await getReservationsSince(oneWeekAgo());
    return { user, reservations };
}
