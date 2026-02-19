import { console_error } from '$lib/server/sentry';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import type { Tables } from '$lib/supabase.types';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

// TODO: break this apart into separate functions
/**
 * @deprecated unused, direct access to supabase now
 */
export async function GET({ locals: { safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user);

		const { data: users } = await supabaseServiceRole
			.from('UsersMinimal')
			.select('*')
			.throwOnError();
		const usersById = users.reduce((obj, user) => {
			obj[user.id!] = user;
			return obj;
		}, {} as { [uid: string]: Tables<'UsersMinimal'> });

		return json({
			status: 'success',
			usersById
		});
	} catch (error) {
		console_error('getUsers', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({ status: 'error', error });
	}
}
