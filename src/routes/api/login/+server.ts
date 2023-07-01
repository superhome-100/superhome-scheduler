import { json, type RequestEvent } from '@sveltejs/kit';
import { createSession } from '$lib/server/session';
import { authenticateUser } from '$lib/server/user';

export async function POST({ cookies, request }: RequestEvent) {
	try {
		const { userId, userName } = await request.json() as { userId: string; userName: string };
		const record = await authenticateUser(userId, userName);
		if (record.status === 'active') {
			if (cookies.get('sessionid') === undefined) {
				const session = await createSession(record);
				let expires = new Date();
				expires.setMonth(expires.getMonth() + 1);
				cookies.set('sessionid', session.id, { path: '/', expires });
			}
		}
		return json({ status: 'success', record });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
