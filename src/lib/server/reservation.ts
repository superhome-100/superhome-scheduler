import type { SelectableColumn, EditableData } from '@xata.io/client';
import type { UsersRecord, ReservationsRecord } from './xata.codegen';
import type { AppFormData, Reservation, ReservationXata, Submission } from '$types';
import type { SettingsStore } from '$lib/settings';

import { ReservationCategory, ReservationStatus, ReservationType, OWTime } from '$types';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getXataClient } from '$lib/server/xata-old';
import { getTimeOverlapFilters } from '$utils/reservation-queries';
import { Settings } from '$lib/settings';
import { initSettings } from './settings';
import { addMissingFields, convertReservationTypes } from '$lib/utils.js';
import {
	getStartTime,
	throwIfNoSpaceAvailable,
	throwIfOverlappingReservation,
	throwIfPastUpdateTime,
	throwIfUserIsDisabled,
	ValidationError
} from '$utils/validation';
import { beforeCancelCutoff, beforeResCutoff } from '$lib/reservationTimes';

import _ from 'lodash';
import dayjs from 'dayjs';
import ObjectsToCsv from 'objects-to-csv';

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
	let records = await client.db.Reservations.select(['*', 'user.*'])
		.filter({
			//@ts-ignore
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
			if (timeStrToMin(rsv.startTime!) < 720) {
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
				name: ent.user!.name,
				nickname: ent.user!.nickname
			};
		})
	);
	return await csv.toString();
}

const throwIfNull = (rsv: any, field: string) => {
	if (rsv[field] == null) {
		throw new Error(`invalid null value for ${field} in reservation ${rsv.id}`);
	}
};

// sanity check that the reservation record coming from xata is valid:
//     assert that enum types have valid values,
//     and that fields that shouldn't be null are not null
export function throwIfReservationIsInvalid(rsv: ReservationXata | null): ReservationXata {
	if (rsv == null) throw new Error('null reservation');
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
	return rsv;
}

const getAugmentedRsv = (settings: SettingsStore, rsv: Reservation): Reservation => {
	let buddies = rsv.buddies;
	let startTime = rsv.startTime;
	let endTime = rsv.endTime;

	if (buddies == null) {
		buddies = [];
	}
	if (rsv.category === ReservationCategory.openwater) {
		if (rsv.owTime === OWTime.AM) {
			startTime = settings.getOpenwaterAmStartTime(rsv.date);
			endTime = settings.getOpenwaterAmEndTime(rsv.date);
		} else if (rsv.owTime === OWTime.PM) {
			startTime = settings.getOpenwaterPmStartTime(rsv.date);
			endTime = settings.getOpenwaterPmEndTime(rsv.date);
		}
	}
	return {
		...rsv,
		buddies,
		startTime,
		endTime
	};
};

export async function convertFromXataToAppType(rawRsvs: (ReservationXata | null)[]) {
	await initSettings();

	// make sure it's safe to cast to the Reservation type
	let reservations = <Reservation[]>rawRsvs.map((rsv) => throwIfReservationIsInvalid(rsv));

	// add values used by app that Reservations table doesn't include
	return reservations.map((rsv) => {
		return getAugmentedRsv(Settings, rsv);
	});
}

export async function getReservationsSince(minDateStr: string) {
	//note: we include rejected and canceled rsvs here so that:
	//  - [rejected rsvs]: users can see which of their rsvs have been rejected
	//  in MyReservations page
	//  - [canceled rsvs]: when app state is refreshed, clients can detect when other
	//  users have canceled an rsv and remove it from their cache
	const rawRsvs = await client.db.Reservations
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

async function getOverlappingReservations(sub: Reservation) {
	await initSettings();
	let filters = {
		date: sub.date,
		$any: getTimeOverlapFilters(Settings, sub),
		status: { $any: [ReservationStatus.pending, ReservationStatus.confirmed] }
	};
	const overlapping = await client.db.Reservations.filter(filters).getAll();
	return await convertFromXataToAppType(overlapping);
}

async function getUserOverlappingReservations(sub: Reservation, userIds: string[]) {
	let overlapping = await getOverlappingReservations(sub);
	return overlapping.filter((rsv) => userIds.includes(rsv.user.id));
}

async function throwIfSubmissionIsInvalid(sub: Submission) {
	await initSettings();

	if (!Settings.getOpenForBusiness(sub.date)) {
		throw new ValidationError('We are closed on this date; please choose a different date');
	}

	if (!categoryIsBookable(sub)) {
		throw new ValidationError(
			`The ${sub.category} is not bookable on this date; please choose a different date`
		);
	}

	let userIds = [sub.user.id, ...sub.buddies];

	await throwIfUserIsDisabled(userIds);

	if (!beforeResCutoff(Settings, sub.date, getStartTime(Settings, sub), sub.category)) {
		throw new ValidationError(
			'The submission window for this reservation date/time has expired. Please choose a later date.'
		);
	}

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	let userOverlappingRsvs = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user.id));
	if (userOverlappingRsvs.length > 0) {
		throw new ValidationError(
			'You or one of your buddies has a pre-existing reservation at this time'
		);
	}

	await throwIfNoSpaceAvailable(Settings, sub, allOverlappingRsvs);
}

function createBuddyEntriesForSubmit(sub: Submission) {
	let entries = [sub];
	if (sub.buddies.length > 0) {
		let { user, buddies, ...common } = sub;
		for (let id of buddies) {
			let bg = [user.id, ...buddies.filter((bid: string) => bid != id)];
			entries.push({ ...common, user: { id }, buddies: bg, owner: false });
		}
	}
	return entries;
}

function unpackSubmitForm(formData: AppFormData): Submission {
	let category = ReservationCategory[formData.get('category') as keyof typeof ReservationCategory];
	let status =
		category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;
	let resType = ReservationType[formData.get('resType') as keyof typeof ReservationType];
	let buoy = resType == ReservationType.cbs ? 'CBS' : 'auto';
	return {
		user: JSON.parse(formData.get('user')),
		date: formData.get('date'),
		category,
		resType,
		buddies: JSON.parse(formData.get('buddies')),
		comments: formData.get('comments'),
		numStudents: JSON.parse(formData.get('numStudents')),
		startTime: formData.get('startTime'),
		endTime: formData.get('endTime'),
		owTime: OWTime[formData.get('owTime') as keyof typeof OWTime],
		maxDepth: JSON.parse(formData.get('maxDepth')),
		pulley: formData.has('pulley') ? formData.get('pulley') == 'on' : null,
		extraBottomWeight: formData.get('extraBottomWeight') == 'on',
		bottomPlate: formData.get('bottomPlate') == 'on',
		largeBuoy: formData.get('largeBuoy') == 'on',
		O2OnBuoy: formData.get('O2OnBuoy') == 'on',
		owner: true,
		status,
		buoy,
		lanes: ['auto']
	};
}

export async function submitReservation(formData: AppFormData) {
	let sub = unpackSubmitForm(formData);
	await throwIfSubmissionIsInvalid(sub);
	let entries = createBuddyEntriesForSubmit(sub);
	let records = await convertFromXataToAppType(await client.db.Reservations.create(entries));
	return { records };
}

async function throwIfUpdateIsInvalid(sub: Reservation, orig: Reservation, ignore: string[]) {
	await initSettings();

	if (!Settings.getOpenForBusiness(sub.date)) {
		throw new ValidationError('We are closed on this date; please choose a different date');
	}

	if (!categoryIsBookable(sub)) {
		throw new ValidationError(
			`The ${sub.category} is not bookable on this date; please choose a different date`
		);
	}

	throwIfPastUpdateTime(Settings, orig, sub);

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	// check that the submitter and associated buddies do not have existing
	// reservations that will overlap with the updated reservation
	let userIds = [sub.user.id, ...sub.buddies];
	throwIfOverlappingReservation(orig, allOverlappingRsvs, userIds);

	await throwIfNoSpaceAvailable(Settings, sub, allOverlappingRsvs, ignore);
}

async function createBuddyEntriesForUpdate(sub: Reservation, orig: Reservation) {
	// create set of all buddies, including the original group and the updated group
	let buddySet = new Set([...sub.buddies, ...orig.buddies]);

	let modify = [sub];
	let create = [];
	let cancel = [];

	if (buddySet.size > 0) {
		let rsvIdByUserId: { [key: string]: string } = {};
		let { id, user, buddies, ...common } = sub;

		delete common.createdAt;

		if (orig.buddies.length > 0) {
			let buddyRsvs = await getUserOverlappingReservations(orig, orig.buddies);
			rsvIdByUserId = buddyRsvs.reduce((obj: typeof rsvIdByUserId, rsv: Reservation) => {
				obj[rsv.user.id] = rsv.id!;
				return obj;
			}, {});
		}

		const getBuddyField = (myId: string) => [
			user.id,
			...buddies.filter((bId: string) => bId != myId)
		];
		for (let bId of buddySet) {
			if (buddies.includes(bId) && orig.buddies.includes(bId)) {
				// modify
				let entry = {
					...common,
					id: rsvIdByUserId[bId],
					user: { id: bId },
					buddies: getBuddyField(bId),
					owner: false
				};
				modify.push(entry);
			} else if (buddies.includes(bId)) {
				// create
				let entry = {
					...common,
					createdAt: common.updatedAt,
					user: { id: bId },
					buddies: getBuddyField(bId),
					owner: false
				};
				create.push(entry);
			} else {
				// cancel
				cancel.push(rsvIdByUserId[bId]!);
			}
		}
	}

	return { modify, create, cancel };
}

function unpackModifyForm(formData: AppFormData, orig: Reservation): Reservation {
	let status =
		orig.category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;
	let buoy = orig.resType == ReservationType.cbs ? 'CBS' : 'auto';

	return {
		id: formData.get('id'),
		date: formData.get('date'),
		category: orig.category, //can't be changed
		startTime: formData.has('startTime') ? formData.get('startTime') : orig.startTime,
		endTime: formData.has('endTime') ? formData.get('endTime') : orig.endTime,
		owTime: formData.has('owTime')
			? OWTime[formData.get('owTime') as keyof typeof OWTime]
			: orig.owTime,
		resType: orig.resType, //can't be changed
		numStudents: formData.has('numStudents')
			? JSON.parse(formData.get('numStudents'))
			: orig.numStudents,
		maxDepth: formData.has('maxDepth') ? JSON.parse(formData.get('maxDepth')) : orig.maxDepth,
		comments: formData.has('comments') ? formData.get('comments') : orig.comments,
		user: orig.user, //can't change
		buddies: JSON.parse(formData.get('buddies')), //buddy updates are dealt with later
		pulley: formData.has('pulley') ? formData.get('pulley') == 'on' : null,
		extraBottomWeight: formData.get('extraBottomWeight') == 'on',
		bottomPlate: formData.get('bottomPlate') == 'on',
		largeBuoy: formData.get('largeBuoy') == 'on',
		O2OnBuoy: formData.get('O2OnBuoy') == 'on',
		createdAt: orig.createdAt,
		owner: true,
		status,
		lanes: ['auto'],
		buoy,
		room: 'auto',
		price: orig.price,
		updatedAt: new Date()
	};
}

export async function modifyReservation(formData: AppFormData) {
	let id = formData.get('id');
	let [orig] = await convertFromXataToAppType([await client.db.Reservations.read(id)]);
	let sub = unpackModifyForm(formData, orig);

	let { create, modify, cancel } = await createBuddyEntriesForUpdate(sub, orig);

	let existing = [...modify.map((rsv) => rsv.id!), ...cancel];
	await throwIfUpdateIsInvalid(sub, orig, existing);

	let records: { [key: string]: Reservation[] } = {
		created: [],
		canceled: []
	};

	let modrecs = await client.db.Reservations.update(modify);
	records.modified = await convertFromXataToAppType(modrecs);

	if (create.length > 0) {
		let createrecs = await client.db.Reservations.create(create);
		records.created = await convertFromXataToAppType(createrecs);
	}

	if (cancel.length > 0) {
		let cancelrecs = await client.db.Reservations.update(
			cancel.map((id) => {
				return { id, status: ReservationStatus.canceled };
			})
		);
		records.canceled = await convertFromXataToAppType(cancelrecs);
	}

	return { records };
}

export async function adminUpdate(formData: AppFormData) {
	let rsv: Partial<EditableData<ReservationsRecord>> = {};

	let id = formData.get('id');
	rsv.status = formData.get('status');

	const cat = formData.get('category');
	if (cat === 'pool') {
		rsv.lanes = [formData.get('lane1')];
		if (formData.has('lane2')) {
			rsv.lanes[1] = formData.get('lane2');
		}
	} else if (cat === 'openwater') {
		rsv.buoy = formData.get('buoy');
	} else if (cat === 'classroom') {
		rsv.room = formData.get('room');
	}

	let record = await client.db.Reservations.update(id, rsv);
	return { record };
}

async function throwIfInvalidCancellation(data: Reservation) {
	await initSettings();
	if (!beforeCancelCutoff(Settings, data.date, data.startTime, data.category)) {
		throw new ValidationError(
			'The cancellation window for this reservation has expired; this reservation can no longer be canceled'
		);
	}
}

export async function cancelReservation(formData: AppFormData) {
	let id = formData.get('id');
	let buddiesToCancel = JSON.parse(formData.get('cancelBuddies'));
	let [sub] = await convertFromXataToAppType([await client.db.Reservations.read(id)]);

	await throwIfInvalidCancellation(sub);

	let save = sub.buddies.filter((id: string) => !buddiesToCancel.includes(id));
	let cancel = [sub.id];
	let records: { [key: string]: Reservation[] } = {
		modified: []
	};
	if (sub.buddies.length > 0) {
		let existing = await getUserOverlappingReservations(sub, sub.buddies);
		let modify = existing
			.filter((rsv) => save.includes(rsv.user.id))
			.map((rsv) => {
				let buddies = save.filter((id: string) => id != rsv.user.id);
				return { ...rsv, buddies };
			});
		if (modify.length > 0) {
			if (modify.reduce((b, rsv) => b || rsv.owner, false) == false) {
				// make sure one of the existing rsvs is the owner
				// doesn't matter which, as long as there is exactly
				// one owner
				modify[0].owner = true;
			}
			let modrecs = await client.db.Reservations.update(modify);
			records.modified = await convertFromXataToAppType(modrecs);
		}

		cancel = cancel.concat(
			existing.filter((rsv) => !save.includes(rsv.user.id)).map((rsv) => rsv.id)
		);
	}

	let cancelrecs = await client.db.Reservations.update(
		cancel.map((id) => {
			return { id, status: 'canceled' };
		})
	);
	records.canceled = await convertFromXataToAppType(cancelrecs);

	return { records };
}
