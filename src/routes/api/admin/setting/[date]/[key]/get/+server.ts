import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import type { Enums } from '$lib/supabase.types';


export async function GET({ params, locals: { safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user, "admin");

		const date = params['date'];
		const key = params['key'];

		const { data } = await supabaseServiceRole
			.from("DaySettings")
			.select("value")
			.eq("date", date)
			.eq("key", key as Enums<'day_setting_key'>)
			.maybeSingle()
			.throwOnError();

		return json(data ?? null);
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
