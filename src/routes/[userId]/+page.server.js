import { getReservations } from '$lib/server/server.js';

export async function load({ params }) {
    let data = await getReservations({view: 'upcoming', ...params});
    return { userId: params.userId, ...data };
}


