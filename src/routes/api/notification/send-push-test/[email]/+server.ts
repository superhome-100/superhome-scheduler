import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import { getSettingsManager } from '$lib/settings';


/**
 * just for testing 
 */
export async function GET({ params, locals: { supabase, safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		const sm = await getSettingsManager(supabase);
		checkAuthorisation(user, 'admin');

		const email = params['email'];

		const { data } = await supabaseServiceRole
			.from("Users")
			.select("id")
			.or(`email.eq.${email},id.eq.${email}`)
			.single()
			.throwOnError();

		const result = await pushNotificationService.send(sm, data.id, 'title', 'notification test');

		return json({ status: 'success', data: result });
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error}` });
	}
}
