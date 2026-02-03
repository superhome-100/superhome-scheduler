import { json } from '@sveltejs/kit';
import { approveAllPendingReservations } from '$lib/server/reservation';
import { doTransaction } from '$lib/server/firestore';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';

export async function POST({ request, locals: { user } }) {
	try {
		checkAuthorisation(user, 'admin');

		const data = await request.json();
		await doTransaction(data.category, data.date, async () => {
			await approveAllPendingReservations(data.category, data.date);
		});
		return json({ status: 'success' });
	} catch (error) {
		if (error instanceof AuthError) {
			return json({ status: 'error', error: error.message }, { status: error.code });
		}
		return json({ status: 'error', error });
	}
}
