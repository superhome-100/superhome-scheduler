import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';


export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, 'admin');

		const requestJson = (await request.json()) as string[];

		let query = supabaseServiceRole
			.from("Reservations")
			.select("*, Users(id, nickname)")
			.in("id", requestJson)

		const { data } = await query
			.throwOnError();

		await pushNotificationService.sendReservationModified(user, data);

		return json({
			status: 'success'
		});
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error} ` });
	}
}
