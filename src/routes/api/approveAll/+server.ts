import { json } from '@sveltejs/kit';
import { approveAllPendingReservations } from '$lib/server/reservation';
import { doTransaction } from '$lib/server/firestore';

export async function POST({ request }: { request: Request }) {
	try {
		const data = await request.json();
		await doTransaction(data.category, data.date, async () => {
			await approveAllPendingReservations(data.category, data.date);
		});
		return json({ status: 'success' });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
