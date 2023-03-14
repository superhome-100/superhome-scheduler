import { json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/server.js';

export async function POST({ cookies }) {
    const session = cookies.get('sessionid');
    let response = await deleteSession(session);
    cookies.delete('sessionid', {path:'/'});
    return json(response);
}
