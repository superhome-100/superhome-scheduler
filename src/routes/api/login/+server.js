import { json } from '@sveltejs/kit';
import { authenticateUser, createSession } from '$lib/server/server.js';

export async function POST({ cookies, request }) {
	try {
		const { userId, userName } = await request.json();
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
