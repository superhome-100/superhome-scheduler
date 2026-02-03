import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';

export async function GET({ params, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		const date = params['date']!;
		const { data: boatAssignments } = await supabaseServiceRole
			.from('Boats')
			.select('*')
			.eq('id', date)
			.single()
			.throwOnError();

		const assignments = boatAssignments?.assignments ? JSON.parse(boatAssignments.assignments) : {};

		return json({ status: 'success', assignments });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
