import { getSession } from '$lib/server/session';
import { json, type RequestEvent } from '@sveltejs/kit';
import type { UsersRecord } from '$lib/server/xata.codegen';

export async function GET({ cookies }: RequestEvent) {
	try {
		let user: UsersRecord | undefined = undefined;
		let viewMode = 'admin';
		let session = cookies.get('sessionid');
		if (session !== undefined) {
			let record = await getSession(session);
			if (record == undefined) {
				// cookie is invalid -> delete it
				cookies.delete('sessionid', { path: '/' });
			} else {
				user = record.user!;
				viewMode = record.viewMode!;
			}
		}
		return json({
			status: 'success',
			user,
			viewMode,
			photoURL: cookies.get('photo_url')
		});
	} catch (error) {
		return json({ status: 'error', error });
	}
}
