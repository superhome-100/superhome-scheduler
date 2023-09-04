import { timeStrToMin } from '$lib/datetimeUtils';
import { getXataClient } from '$lib/server/xata-old';
import type { SelectableColumn } from '@xata.io/client';
import ObjectsToCsv from 'objects-to-csv';
import _ from 'lodash';
import type { ReservationsRecord, UsersRecord } from './xata.codegen';
import type { Reservation } from '$types';
import { ReservationCategory, ReservationStatus, ReservationType, OWTime } from '$types';
import type { SettingsStore } from '$lib/settings';
import { Settings } from '$lib/settings';
import { initSettings } from './settings';
import dayjs from 'dayjs';

const client = getXataClient();

export async function getReservationsCsv(branch: string) {
	const client = getXataClient(branch);
	const fields = [
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
	] as SelectableColumn<Reservation, []>[];
	// download all rsvs from the 1st day of the previous month
	let dateStr = dayjs()
		.month(dayjs().month() - 1)
		.startOf('month')
		.locale('en-US')
		.format('YYYY-MM-DD');
	let records = <Reservation[]>await client.db.Reservations.filter({
		date: { $ge: dateStr }
	})
		.select(fields)
		.getAll();

	// conveniences for the admins:
	//  set numStudents = 1 for autonomous bookings
	//  set owTime for pool/classroom based on whether startTime is in AM or PM
	records = records.map((rsv) => {
		let numStudents = rsv.numStudents;
		if (rsv.resType == ReservationType.autonomous) {
			numStudents = 1;
		}
		let owTime = rsv.owTime;
		if (rsv.category != ReservationCategory.openwater) {
			if (timeStrToMin(rsv.startTime) < 720) {
				owTime = OWTime.AM;
			} else {
				owTime = OWTime.PM;
			}
		}
		return { ...rsv, owTime, numStudents };
	});

	const csv = new ObjectsToCsv(
		records.map((ent) => {
			return {
				..._.omit(ent, ['user']),
				name: ent.user.name,
				nickname: ent.user.nickname
			};
		})
	);
	return await csv.toString();
}

export async function convertFromXataToAppType(rawRsvs: ReservationsRecord[]) {
	await initSettings();

	// make sure it's safe to cast to the Reservation type
	rawRsvs.map((rsv) => throwIfReservationIsInvalid(rsv));
	let reservations = <Reservation[]>rawRsvs;

	// get user records for each buddy
	let userIds = reservations.map((rsv) => rsv.user.id);
	let users: (UsersRecord | null)[] = await client.db.Users.read(userIds);
	let usersById = users.reduce((obj: { [key: string]: UsersRecord }, user: UsersRecord | null) => {
		if (user == null) {
			throw new Error('unknown user record');
		} else {
			obj[user.id] = user;
		}
		return obj;
	}, {});

	// add values used by app that Reservations table doesn't include
	return reservations.map((rsv) => {
		let user = usersById[rsv.user.id];
		return getAugmentedRsv(Settings, rsv, user);
	});
}

const getAugmentedRsv = (settings: SettingsStore, rsv: Reservation, user: UsersRecord) => {
	let buddies = rsv.buddies;
	let startTime = rsv.startTime;
	let endTime = rsv.endTime;

	if (buddies == null) {
		buddies = [];
	}
	if (rsv.category === 'openwater') {
		if (rsv.owTime === 'AM') {
			startTime = settings.getOpenwaterAmStartTime(rsv.date);
			endTime = settings.getOpenwaterAmEndTime(rsv.date);
		} else if (rsv.owTime === 'PM') {
			startTime = settings.getOpenwaterPmStartTime(rsv.date);
			endTime = settings.getOpenwaterPmEndTime(rsv.date);
		}
	}
	return {
		...rsv,
		user,
		buddies,
		startTime,
		endTime
	};
};

export async function getReservationsSince(minDateStr: string) {
	//note: we include rejected and canceled rsvs here so that:
	//  - [rejected rsvs]: users can see which of their rsvs have been rejected
	//  in MyReservations page
	//  - [canceled rsvs]: when app state is refreshed, clients can detect when other
	//  users have canceled an rsv and remove it from their cache
	const rawRsvs = await client.db.Reservations.select(['*', 'user.*'])
		// @ts-ignore - seems to be a bug in the xata client types
		.filter({ date: { $ge: minDateStr } })
		.sort('date', 'asc')
		.getAll();

	let reservations = await convertFromXataToAppType(rawRsvs);
	return reservations;
}

export async function categoryIsBookable(sub: Reservation): Promise<boolean> {
	await initSettings();

	let val;
	if (sub.category === ReservationCategory.pool) {
		val = Settings.getPoolBookable(sub.date);
	} else if (sub.category === ReservationCategory.openwater) {
		if (sub.owTime == OWTime.AM) {
			val = Settings.getOpenwaterAmBookable(sub.date);
		} else if (sub.owTime == OWTime.PM) {
			val = Settings.getOpenwaterPmBookable(sub.date);
		} else {
			throw new Error('invalid OWTime: ' + sub.owTime);
		}
	} else if (sub.category === ReservationCategory.classroom) {
		val = Settings.getClassroomBookable(sub.date);
	} else {
		throw new Error('invalid category: ' + sub.category);
	}

	return val;
}

const throwIfNull = (rsv: any, field: string) => {
	if (rsv[field] == null) {
		throw new Error(`invalid null value for ${field} in reservation ${rsv.id}`);
	}
};

// sanity check that the reservation record coming from xata is valid:
//     assert that enum types have valid values,
//     and that fields that shouldn't be null are not null
export function throwIfReservationIsInvalid(rsv: ReservationsRecord) {
	if (!Object.keys(ReservationCategory).includes(rsv.category!)) {
		throw new Error(`invalid reservation category "${rsv.category}" for ${rsv.id}`);
	} else {
		if (rsv.category == ReservationCategory.openwater) {
			if (!Object.keys(OWTime).includes(rsv.owTime!)) {
				throw new Error(`invalid owTime "${rsv.owTime}" for ${rsv.id}`);
			}
			throwIfNull(rsv, 'maxDepth');
			throwIfNull(rsv, 'buoy');
		} else {
			throwIfNull(rsv, 'startTime');
			throwIfNull(rsv, 'endTime');
		}
	}
	if (!Object.keys(ReservationType).includes(rsv.resType!)) {
		throw new Error(`invalid reservation type "${rsv.resType}" for ${rsv.id}`);
	} else {
		if (rsv.resType == ReservationType.course) {
			throwIfNull(rsv, 'numStudents');
		}
	}
	if (!Object.keys(ReservationStatus).includes(rsv.status!)) {
		throw new Error(`invalid reservation status "${rsv.status}" for ${rsv.id}`);
	}
	throwIfNull(rsv, 'user');
}
