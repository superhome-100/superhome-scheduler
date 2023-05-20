import { json } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata.js';

const xata = getXataClient();

export async function POST({ request }) {
	try {
		let { date, assignments } = await request.json();
		let record = await xata.db.Boats.createOrUpdate({
			id: date,
			assignments: JSON.stringify(assignments)
		});
		return json({ status: 'success', record });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
