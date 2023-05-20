import { json } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/server.js';

export async function POST({ cookies }) {
	const session = cookies.get('sessionid');
	cookies.delete('sessionid', { path: '/' });
	try {
		await deleteSession(session);
		return json({ status: 'success' });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
