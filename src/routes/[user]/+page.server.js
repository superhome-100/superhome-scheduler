/*import { getReservations } from '$lib/server/server.js';
*/
export async function load({ params }) {
    return { name: params.user };
}


