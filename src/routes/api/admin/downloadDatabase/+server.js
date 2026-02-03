import { getBackUpZip } from '$lib/server/server';
import { getReservationsCsv } from '$lib/server/reservation';
import { checkAuthorisation } from '$lib/server/supabase';

export async function POST({ request, locals: { user } }) {
	checkAuthorisation(user, 'admin');

	let { table } = await request.json();
	if (table === 'Reservations') {
		let csv = await getReservationsCsv();
		return new Response(csv, {
			status: 200,
			headers: {
				'Content-type': 'text/csv; charset=UTF-8',
				'Content-Disposition': `attachment; filename=reservations.csv`
			}
		});
	} else {
		let zip = await getBackUpZip();
		return zip.generateAsync({ type: 'blob' }).then(function (content) {
			return new Response(content, {
				status: 200,
				headers: {
					'Content-type': 'zip; charset=UTF-8',
					'Content-Disposition': `attachment; filename=backup.zip`
				}
			});
		});
	}
}
