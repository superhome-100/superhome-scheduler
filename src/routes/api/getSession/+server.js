import { getSession } from '$lib/server/server.js';
import { json } from '@sveltejs/kit';

export async function GET({ cookies }) {
	try {
		let user;
		let viewMode = 'admin';
		let session = cookies.get('sessionid');
		if (session !== undefined) {
			let record = await getSession(session);
			if (record == undefined) {
				// cookie is invalid -> delete it
				cookies.delete('sessionid', { path: '/' });
			} else {
				user = record.user;
				viewMode = record.viewMode;
			}
		}
		return json({ status: 'success', user, viewMode });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
