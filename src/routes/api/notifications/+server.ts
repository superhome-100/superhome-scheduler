import { getUserByCookies } from '$lib/server/user';
import { getUserActiveNotifications } from '$lib/server/server';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function GET({ cookies }: RequestEvent) {
	const user = await getUserByCookies(cookies);
	if (!user) throw new Error('no session');

	const notifications = await getUserActiveNotifications(user.id);
	return json(notifications);
}
