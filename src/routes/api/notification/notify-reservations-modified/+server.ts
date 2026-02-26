import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import { getSettingsManager } from '$lib/settings';

// admin-reservations
export async function POST({ request, locals: { supabase, safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user, 'admin');
		const sm = await getSettingsManager(supabase);

		const requestJson = (await request.json()) as string[];

		let query = supabaseServiceRole
			.from("Reservations")
			.select("*")
			.in("id", requestJson)

		const { data } = await query
			.throwOnError();

		await pushNotificationService.sendReservationModified(sm, null, data);

		return json({
			status: 'success'
		});
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error} ` });
	}
}
