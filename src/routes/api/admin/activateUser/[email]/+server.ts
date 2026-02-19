import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { json } from '@sveltejs/kit';
import { UserStatus } from '$types';


export async function GET({ params, locals: { safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user, "admin");

		const email = params['email'];

		const { data } = await supabaseServiceRole
			.from("Users")
			.update({ status: UserStatus.active })
			.select("*")
			.eq("email", email)
			.single()
			.throwOnError();

		return json({ status: 'success', message: 'activated user', user: data });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error }, { status: 500 });
	}
}
