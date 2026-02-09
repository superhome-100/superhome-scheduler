import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, sessionToSessionId, supabaseServiceRole } from '$lib/server/supabase';

export async function POST({ request, locals: { user, session } }: RequestEvent) {
	try {
		checkAuthorisation(user);
		const sessionId = sessionToSessionId(session!)

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
