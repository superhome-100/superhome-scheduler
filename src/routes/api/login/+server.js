import { json } from '@sveltejs/kit';
import { authenticateUser, createSession } from '$lib/server/server.js';
import { SESSION_TIME } from '$lib/constants.js';

export async function POST({ cookies, request })  {
    const { userId, userName } = await request.json();
    const record = await authenticateUser(userId, userName);
    if (record.status === 'active') {
        if (cookies.get('sessionid') === undefined) {
            const session = await createSession(record);
            let expires = new Date();
            expires.setTime(session.createdAt.getTime() + SESSION_TIME)
            cookies.set('sessionid', session.id, {path: '/', expires: expires});
        }
    }
    return json(record);
}
