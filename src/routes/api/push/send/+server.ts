import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { PUBLIC_VAPID_KEY } from '$env/static/public';
import { PRIVATE_VAPID_KEY } from '$env/static/private';
import { PUBLIC_VAPID_SUBJECT } from '$env/static/public';
import webpush from 'web-push';
import { checkAuthorisation } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';

webpush.setVapidDetails(
	PUBLIC_VAPID_SUBJECT,
	PUBLIC_VAPID_KEY,
	PRIVATE_VAPID_KEY
);

/**
 * just for testing 
 */
export async function GET({ locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		await pushNotificationService.send(user, 'notification test');

		return json({ status: 'success' });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
