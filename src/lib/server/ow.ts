import { getYYYYMMDD } from '$lib/datetimeUtils';
import type { Tables } from '$lib/supabase.types';
import type { OWTime } from '$types';
import { supabaseServiceRole } from './supabase';

interface BuoyGroupingComment {
	buoy: string;
	date: string; // yyyy-mm-dd
	am_pm: OWTime;
	comment: string;
}

export const upsertOWReservationAdminComments = async (data: BuoyGroupingComment) => {
	const { buoy, date, am_pm, comment } = data;
	const recordId = `${buoy}-${date}-${am_pm}`;
	let record;
	if (comment) {
		try {
			await supabaseServiceRole
				.from('BuoyGroupings')
				.upsert({
					id: recordId,
					buoy,
					date: getYYYYMMDD(date),
					am_pm,
					comment
				})
				.throwOnError();
		} catch (error) {
			console.error('upsertOWReservationAdminComments', error);
		}
	} else {
		// delete comment if it exists
		const { data: rec } = await supabaseServiceRole
			.from('BuoyGroupings')
			.delete()
			.eq('id', recordId)
			.select('*')
			.throwOnError();
		record = { ...rec, comment: null };
	}
	return record;
};

export const getOWReservationAdminComments = async (
	date: string
): Promise<Tables<'BuoyGroupings'>[]> => {
	const { data } = await supabaseServiceRole
		.from('BuoyGroupings')
		.select('*')
		.eq('date', getYYYYMMDD(date))
		.throwOnError();
	return data;
};
