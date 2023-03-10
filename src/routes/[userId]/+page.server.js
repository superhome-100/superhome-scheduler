import { getUserReservations } from '$lib/server/server.js';

export async function load({ params, setHeaders }) {
    const { userId } = params;
    const reservations = await getUserReservations(userId);
    setHeaders({
        'cache-control': 'max-age=300'
    });
    return { reservations };
}


