import { getFutureReservations } from '$lib/server/server.js';

export async function load() {
    const reservations = await getFutureReservations();
    return { reservations };
}


