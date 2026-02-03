import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import type { Tables } from '$lib/supabase.types';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const { data: assignments } = await supabaseServiceRole
			.from('Boats')
			.select('*')
			.throwOnError();
		const assignmentsById = assignments.reduce((obj, ent) => {
			obj[ent.id] = ent.assignments ? JSON.parse(ent.assignments) : {};
			return obj;
		}, {} as { [id: string]: Tables<'Boats'> });
		return json({ status: 'success', assignmentsById });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		} else if (error instanceof Error) {
			return json({ status: 'error', error: error.message }, { status: 500 });
		}
		return json({ status: 'error', error });
	}
}
