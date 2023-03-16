import { getSession } from '$lib/server/server.js';
import { redirect, json } from '@sveltejs/kit';

export async function GET({ route, cookies })  {
    let user;
    let session = cookies.get('sessionid');
    if (session === undefined) {
        if (route.id !== '/') {
            throw redirect(307, '/');
        }
    } else {
        let record = await getSession(session);
        user = record.user;
    }
    return json(user);
}
