import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { supabaseServiceRole, checkAuthorisation, AuthError } from '$lib/server/supabase';
import { console_error } from '$lib/server/sentry';

interface Assignment {
	// Add appropriate assignment properties here based on your data structure
	[key: string]: any;
}

interface RequestData {
	date: string;
	assignments: Assignment[];
}

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, 'admin');

		const { date, assignments } = (await request.json()) as RequestData;
		console.log('assignBuoysToBoats', date, assignments);

		const { data: record } = await supabaseServiceRole
			.from('Boats')
			.upsert({
				id: date,
				assignments: JSON.stringify(assignments)
			})
			.select('*')
			.throwOnError();

		return json({ status: 'success', record });
	} catch (error) {
		console_error('error assignBuoysToBoats', error);
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
