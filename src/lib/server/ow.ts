import type { BuoyGroupings } from './xata.codegen';
import { getXataClient } from '$lib/server/xata-old';

interface BuoyGroupingComment {
	buoy: string;
	date: string; // yyyy-mm-dd
	am_pm: 'am' | 'pm';
	comment: string;
}

export const upsertOWReservationAdminComments = async (data: BuoyGroupingComment) => {
	const client = getXataClient();
	const { buoy, date, am_pm, comment } = data;
	const recordId = `${buoy}-${date}-${am_pm}`;
	console.log('ow comment recordId', recordId);
	try {
		await client.db.BuoyGroupings.create(recordId, {
			buoy,
			date: new Date(date),
			am_pm,
			comment
		});
		console.log('created new buoy comment', recordId);
	} catch (error) {
		console.error('already exists', error);
		await client.db.BuoyGroupings.update(recordId, { comment });
		console.log('updated buoy comment', recordId);
	}
};
