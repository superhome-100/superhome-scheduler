import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';


export async function GET({ params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, "admin");

		const date = params['date'];
		const key = params['key'];

		const { data } = await supabaseServiceRole
			.from("DaySettings")
			.select("value")
			.eq("date", date)
			.eq("key", key)
			.throwOnError();

		if (data.length == 0) {
			return json(null);
		} else if (data.length == 1) {
			return json(data[0].value);
		} else {
			throw Error(`assertion ${date}.${key} returned with more than 1 row`);
		}
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
