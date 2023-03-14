import { json } from '@sveltejs/kit';
import { authenticateUser, createSession } from '$lib/server/server.js';

export async function POST({ cookies, request })  {
    const { userId, userName } = await request.json();
    const record = await authenticateUser(userId, userName);
    if (record.status === 'active') {
        if (cookies.get('sessionid') === undefined) {
            const session = await createSession(record);
            cookies.set('sessionid', session.id, {path: '/'});
        }
    }
    return json(record);
}
