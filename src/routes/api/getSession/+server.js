import { getSession } from '$lib/server/server.js';
import { json } from '@sveltejs/kit';

export async function GET({ cookies })  {
    let user;
    let session = cookies.get('sessionid');
    if (session !== undefined) {
        let record = await getSession(session);
        user = record.user;
    }
    return json({user});
}
