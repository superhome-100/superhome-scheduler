import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';

export async function POST({ request, locals: { user, session } }: RequestEvent) {
	try {
		checkAuthorisation(user);
		const base64 = session!.access_token.split('.')[1]
		const jsStr = Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
		const sessionId = JSON.parse(jsStr).session_id;

		const pushSubscription = await request.json();

		await supabaseServiceRole
			.from("UserSessions")
			.upsert({ sessionId, userId: user.id, pushSubscription })
			.throwOnError()

		return json({ status: 'success' });
	} catch (e) {
		const message = e instanceof Error ? e.message : `${e}`;
		return json({ status: 'error', error: message });
	}
}
