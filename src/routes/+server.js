import { json } from '@sveltejs/kit';
import { authenticateUser } from '$lib/server/server.js';

export async function POST({ request })  {
    const { userId, userName } = await request.json();
    const status = await authenticateUser(userId, userName);
    return json(status);
}
