import { getXataClient } from '$lib/server/xata.js';

const xata = getXataClient();

export async function POST({ request, cookies }) {
    try {
        let { viewMode } = await request.json();
        let session = cookies.get('sessionid');
        if (session != undefined) {
            await xata.db.Sessions.update({id: session, viewMode});
        }
        return new Response('View mode updated', {status:200});
    } catch (error) {
        return new Response('Could not update viewMode', {status:500});
    }
}


