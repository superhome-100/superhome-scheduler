import { json, type RequestEvent } from '@sveltejs/kit';
import { deleteSession } from '$lib/server/session';

export async function POST({ cookies }: RequestEvent) {
	const session = cookies.get('sessionid') as string;
	cookies.delete('sessionid', { path: '/' });
	try {
		await deleteSession(session);
		return json({ status: 'success' });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
