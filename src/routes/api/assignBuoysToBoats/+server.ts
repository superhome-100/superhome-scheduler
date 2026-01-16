import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getXataClient } from '$lib/server/xata-old';

const xata = getXataClient();

interface Assignment {
	// Add appropriate assignment properties here based on your data structure
	[key: string]: any;
}

interface RequestData {
	date: string;
	assignments: Assignment[];
}

export async function POST({ request }: RequestEvent) {
	try {
		const { date, assignments } = (await request.json()) as RequestData;
		console.log('assignBuoysToBoats', date, assignments);

		const record = await xata.db.Boats.createOrUpdate({
			id: date,
			assignments: JSON.stringify(assignments)
		});

		return json({ status: 'success', record });
	} catch (error) {
		console.error('error assignBuoysToBoats', error);
		return json({
			status: 'error',
			error: error instanceof Error ? error.message : 'Unknown error'
		});
	}
}
