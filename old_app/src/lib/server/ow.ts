import type { BuoyGroupings } from './xata.codegen';
import { getXataClient } from '$lib/server/xata-old';
import type { OWTime } from '$types';

interface BuoyGroupingComment {
	buoy: string;
	date: string; // yyyy-mm-dd
	am_pm: OWTime;
	comment: string;
}

export const upsertOWReservationAdminComments = async (data: BuoyGroupingComment) => {
	const client = getXataClient();
	const { buoy, date, am_pm, comment } = data;
	const recordId = `${buoy}-${date}-${am_pm}`;
	let record;
	if (comment) {
		try {
			record = await client.db.BuoyGroupings.createOrUpdate(recordId, {
				buoy,
				date: new Date(date),
				am_pm,
				comment
			});
		} catch (error) {
			console.error('upsertOWReservationAdminComments', error);
		}
	} else {
		// delete comment if it exists
		const rec = await client.db.BuoyGroupings.delete(recordId);
		record = { ...rec, comment: null };
	}
	return record;
};

export const getOWReservationAdminComments = async (date: string): Promise<BuoyGroupings[]> => {
	const client = getXataClient();
	const data = await client.db.BuoyGroupings.filter({
		date: new Date(date)
	}).getMany();
	return data;
};
