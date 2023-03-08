/*import { getReservations } from '$lib/server/server.js';
*/
export async function load({ params }) {
    //let data = await getReservations({view: 'upcoming', userId: params.userId});
    return { name: params.user } //, ...data };
}


