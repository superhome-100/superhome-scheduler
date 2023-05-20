import { getReservationsCsv, getBackUpZip } from '$lib/server/server.js';

export async function POST({ request }) {
	let { branch } = await request.json();
	if (branch === 'main') {
		let csv = await getReservationsCsv(branch);
		return new Response(csv, {
			status: 200,
			headers: {
				'Content-type': 'text/csv; charset=UTF-8',
				'Content-Disposition': `attachment; filename=reservations-${branch}.csv`
			}
		});
	} else {
		let zip = await getBackUpZip(branch);
		return zip.generateAsync({ type: 'blob' }).then(function (content) {
			return new Response(content, {
				status: 200,
				headers: {
					'Content-type': 'zip; charset=UTF-8',
					'Content-Disposition': `attachment; filename=${branch}.zip`
				}
			});
		});
	}
}
