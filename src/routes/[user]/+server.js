import { json } from '@sveltejs/kit';
import { getReservations } from '$lib/server/server.js';

export async function POST({ request }) {
    const params = await request.json();
    const { reservations } = await getReservations(params);
    return json(reservations);
}

