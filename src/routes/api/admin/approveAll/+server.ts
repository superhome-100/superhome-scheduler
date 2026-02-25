import { json } from '@sveltejs/kit';
import { approveAllPendingReservations } from '$lib/server/reservation';
import { doTransaction } from '$lib/server/transaction';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';
import { getSettingsManager } from '$lib/settings.js';

export async function POST({ request, locals: { supabase, safeGetSession } }) {
	try {
		const { user } = await safeGetSession();
		checkAuthorisation(user, 'admin');
		const sm = await getSettingsManager(supabase);

		const data = await request.json();
		await doTransaction(data.category, data.date, async () => {
			await approveAllPendingReservations(user, data.category, data.date, sm);
		});
		return json({ status: 'success' });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
