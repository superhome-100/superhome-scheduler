import { json } from '@sveltejs/kit';
import { authenticateUser } from '$lib/server/server.js';

export async function POST({ request })  {
    const params = await request.json();
    const status = await authenticateUser(params);
    return json(status);
}
