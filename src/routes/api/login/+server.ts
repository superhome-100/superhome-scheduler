import { json, type RequestEvent } from '@sveltejs/kit';
import { createSession } from '$lib/server/session';
import { authenticateUser } from '$lib/server/user';

export interface LoginUserData {
	userId: string;
	userName: string;
	photoURL: string;
	email: string;
	providerId: string;
	firebaseUID: string;
	userRecordId: string; // from the old fb account xata record id
}
export async function POST({ cookies, request }: RequestEvent) {
	try {
		const { userId, userName, photoURL, email, providerId, firebaseUID, userRecordId } =
			(await request.json()) as LoginUserData;

		const record = await authenticateUser({
			userRecordId,
			userId,
			userName,
			email,
			providerId,
			firebaseUID
		});

		// TODO: replace this with firebase session token auth setup
		const sessionId = cookies.get('sessionid');
		if (!sessionId && record) {
			const session = await createSession(record);
			let expires = new Date();
			expires.setMonth(expires.getMonth() + 1);
			cookies.set('sessionid', session.id, { path: '/', expires });
			cookies.set('photo_url', photoURL, { path: '/', expires });
		}
		return json({ status: 'success', record });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
