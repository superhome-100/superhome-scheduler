import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';

/**
 * @deprecated unused, direct access to supabase now
 */
export async function GET({ params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const date = params['date']!;
		const { data: boatAssignments } = await supabaseServiceRole
			.from('Boats')
			.select('*')
			.eq('id', date)
			.throwOnError();

		let assignments = {};
		if (boatAssignments.length > 0 && boatAssignments[0].assignments) {
			assignments = boatAssignments[0].assignments;
		}
		return json({ status: 'success', assignments });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
