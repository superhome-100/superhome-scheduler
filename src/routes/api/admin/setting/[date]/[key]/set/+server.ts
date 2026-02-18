import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { Enums } from '$lib/supabase.types';


export async function PUT({ request, params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, "admin");

		const date = params['date'];
		const key = params['key'] as Enums<'day_setting_key'>;
		const value = await request.json();

		await supabaseServiceRole
			.from("DaySettings")
			.upsert({ date, key, value })
			.eq("date", date)
			.eq("key", key)
			.throwOnError();
		return new Response(null, { status: 204 });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({ status: 'error', error });
	}
}
