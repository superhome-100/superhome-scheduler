import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const subscription = await request.json();

		await supabaseServiceRole
			.from("Users")
			.update({ pushSubscripton: subscription })
			.eq("id", user.id)
			.throwOnError()

		return json({ success: true });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
