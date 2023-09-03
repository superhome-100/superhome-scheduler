import { timeStrToMin } from '$lib/datetimeUtils';
import { getXataClient } from '$lib/server/xata-old';
import type { SelectableColumn } from '@xata.io/client';
import type { ReservationsRecord } from './xata';
import ObjectsToCsv from 'objects-to-csv';
import _ from 'lodash';
import type { ReservationData } from '$types';
import { Settings } from './settings';

const client = getXataClient();

export async function getReservationsCsv(branch: string) {
	const client = getXataClient(branch);
	const fields = [
		'user.id',
		'user.name',
		'user.nickname',
		'date',
		'category',
		'price',
		'status',
		'resType',
		'numStudents',
		'owTime',
		'startTime',
		'endTime'
	] as SelectableColumn<ReservationsRecord, []>[];
	let records = await client.db.Reservations.select(fields).getAll();

	records = records.map((rsv) => {
		let numStudents = rsv.numStudents;
		if (numStudents == null) {
			numStudents = 1;
		}
		let owTime = rsv.owTime;
		if (owTime == null) {
			if (timeStrToMin(rsv.startTime) < 720) {
				owTime = 'AM';
			} else {
				owTime = 'PM';
			}
		}
		return { ...rsv, owTime, numStudents };
	});

	const csv = new ObjectsToCsv(
		records.map((ent) => {
			return {
				..._.omit(ent, ['user']),
				name: ent.user?.name || ent.user.id,
				nickname: ent.user?.nickname || 'no nickname'
			};
		})
	);
	return await csv.toString();
}

export async function getReservationsSince(minDateStr: string) {
	//note: we include rejected and canceled rsvs here so that:
	//  - [rejected rsvs]: users can see which of their rsvs have been rejected
	//  in MyReservations page
	//  - [canceled rsvs]: in refreshAppState fn, clients can detect when other
	//  users have canceled an rsv and remove it from their cache
	const reservations = await client.db.Reservations.select(['*', 'user.*'])
		// @ts-ignore - seems to be a bug in the xata client types
		.filter({ date: { $ge: minDateStr } })
		.sort('date', 'asc')
		.getAll();

	return reservations;
}

export async function categoryIsBookable(sub: ReservationData): Promise<boolean> {
	await Settings.init();

	let val;
	if (sub.category === 'pool') {
		val = Settings.get('poolBookable', sub.date);
	} else if (sub.category === 'openwater') {
		if (sub.owTime == 'AM') {
			val = Settings.get('openwaterAmBookable', sub.date);
		} else if (sub.owTime == 'PM') {
			val = Settings.get('openwaterPmBookable', sub.date);
		}
	} else if (sub.category === 'classroom') {
		val = Settings.get('classroomBookable', sub.date);
	}

	return !!val;
}
