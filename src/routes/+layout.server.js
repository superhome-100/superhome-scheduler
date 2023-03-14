import { redirect } from '@sveltejs/kit';
import { getSession, deleteSession, getReservationsSince } from '$lib/server/server.js';
import { datetimeToLocalDateStr } from '$lib/ReservationTimes.js';
import { SESSION_TIME } from '$lib/constants.js';

export async function load({ route, cookies })  {
    let user;
    let session = cookies.get('sessionid');
    let now = new Date();
    if (session === undefined) {
        if (route.id !== '/') {
            throw redirect(307, '/');
        }
    } else {
        let record = await getSession(session);
        if (now - record.createdAt > SESSION_TIME) {
            alert('cookie deleted!');
            cookies.delete('sessionid', {path:'/'});
            await deleteSession(session);
            if (route.id !== '/') {
                throw redirect(307, '/');
            }
        }
        user = record.user;
    }
    const oneWeekAgo = () => {
        let d = new Date();
        d.setDate(now.getDate()-7);
        return datetimeToLocalDateStr(d);
    }

    const reservations = await getReservationsSince(oneWeekAgo());
    return { user, reservations };
}
