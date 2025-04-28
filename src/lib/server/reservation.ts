import type { SelectableColumn, EditableData } from '@xata.io/client';
import type { ReservationsRecord } from './xata.codegen';
import type { AppFormData, Reservation, ReservationXata, Submission } from '$types';

import { ReservationCategory, ReservationStatus, ReservationType, OWTime } from '$types';
import { timeStrToMin, isValidProSafetyCutoff } from '$lib/datetimeUtils';
import { getXataClient } from '$lib/server/xata-old';
import { getTimeOverlapFilters } from '$utils/reservation-queries';
import { initSettings, type SettingsManager } from './settings';
import { getDateSetting } from './firestore';
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
				name: _.get(ent, 'user.name', 'no name'),
				nickname: _.get(ent, 'user.nickname', 'no name')
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

const getAugmentedRsv = (settings: SettingsManager, rsv: Reservation): Reservation => {
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
	const settings = await initSettings();

	// make sure it's safe to cast to the Reservation type
	let reservations = <Reservation[]>rawRsvs.map((rsv) => throwIfReservationIsInvalid(rsv));

	// add values used by app that Reservations table doesn't include
	return reservations.map((rsv) => {
		return getAugmentedRsv(settings, rsv);
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

export function categoryIsBookable(settings: SettingsManager, sub: Submission): boolean {
	let isBookable = false;

	switch (sub.category) {
		case ReservationCategory.pool:
			isBookable = settings.getPoolBookable(sub.date);
			break;
		case ReservationCategory.openwater:
			if (sub.owTime == OWTime.AM) {
				isBookable = settings.getOpenwaterAmBookable(sub.date);
			} else {
				isBookable = settings.getOpenwaterPmBookable(sub.date);
			}
			break;
		case ReservationCategory.classroom:
			isBookable = settings.getClassroomBookable(sub.date);
			break;
	}

	return isBookable;
}

async function getOverlappingReservations(sub: Submission) {
	const settings = await initSettings();
	const filters = {
		date: sub.date,
		$any: getTimeOverlapFilters(settings, sub),
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
	const settings = await initSettings();

	if (!settings.getOpenForBusiness(sub.date)) {
		throw new ValidationError('We are closed on this date; please choose a different date');
	}

	if (!categoryIsBookable(settings, sub)) {
		throw new ValidationError(
			`The ${sub.category} is not bookable on this date; please choose a different date`
		);
	}

	let userIds = [sub.user.id, ...sub.buddies];

	await throwIfUserIsDisabled(userIds);

	if (sub.resType === 'proSafety') {
		const isValid = isValidProSafetyCutoff(sub.date);
		if (!isValid) throw new ValidationError('PRO_SAFETY reservation should be done before 4PM.');
	}

	if (!beforeResCutoff(settings, sub.date, getStartTime(settings, sub), sub.category)) {
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

	const day = dayjs(sub.date).day();
	const tuesday = 2;
	const friday = 5;
	const competitionSetupDays = [tuesday, friday];
	if (
		[ReservationType.autonomousPlatformCBS, ReservationType.autonomousPlatform].includes(
			sub.resType
		)
	) {
		if (competitionSetupDays.includes(day)) {
			throw new ValidationError('This training type is not available during Tuesdays and Fridays');
		}
		if (sub.buddies?.length < 2) {
			throw new ValidationError(`Booking this training type requires a minimum of 2 buddies.`);
		}
	}

	if (ReservationType.competitionSetupCBS === sub.resType && !competitionSetupDays.includes(day)) {
		throw new ValidationError(
			'Competition setup training is available only during Tuesdays and Fridays'
		);
	}

	await throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs);
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

const buoyCBS = 'CBS';
const onCBSBuoy = [
	ReservationType.cbs,
	ReservationType.competitionSetupCBS,
	ReservationType.autonomousPlatformCBS
];

const getBuoy = (resType: ReservationType) => (onCBSBuoy.includes(resType) ? buoyCBS : 'auto');

function unpackSubmitForm(formData: AppFormData): Submission {
	const category =
		ReservationCategory[formData.get('category') as keyof typeof ReservationCategory];
	const status =
		category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;
	const resType = ReservationType[formData.get('resType') as keyof typeof ReservationType];
	const buoy = getBuoy(resType);

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
		shortSession: formData.get('shortSession') == 'on',
		owner: true,
		status,
		buoy,
		lanes: ['auto'],
		allowAutoAdjust: ['on', 'true'].includes(formData.get('allowAutoAdjust'))
	};
}

export async function submitReservation(formData: AppFormData) {
	const sub = unpackSubmitForm(formData);
	await throwIfSubmissionIsInvalid(sub);
	let entries = createBuddyEntriesForSubmit(sub);
	const createdReservations = await client.db.Reservations.create(entries);
	let records = await convertFromXataToAppType(createdReservations);
	return { records };
}

async function throwIfUpdateIsInvalid(sub: Reservation, orig: Reservation, ignore: string[], isAMFull: boolean) {
	const settings = await initSettings();

	if (!settings.getOpenForBusiness(sub.date)) {
		throw new ValidationError('We are closed on this date; please choose a different date');
	}

	if (!categoryIsBookable(settings, sub)) {
		throw new ValidationError(
			`The ${sub.category} is not bookable on this date; please choose a different date`
		);
	}

	throwIfPastUpdateTime(settings, orig, sub);

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	// check that the submitter and associated buddies do not have existing
	// reservations that will overlap with the updated reservation
	let userIds = [sub.user.id, ...sub.buddies];
	throwIfOverlappingReservation(orig, allOverlappingRsvs, userIds);

	// check if course and type ow, retrieve if day is ow am is full
	if (sub.resType === ReservationType.course && sub.category === ReservationCategory.openwater) {
		if (isAMFull && sub.numStudents > orig.numStudents && sub.owTime === OWTime.AM) {
			throw new ValidationError('The morning open water session is full for this date cannot increase the number of students.');
		}
	}

	await throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs, ignore);
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

async function unpackModifyForm(formData: AppFormData, orig: Reservation): Promise<Reservation> {
	const status =
		orig.category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;

	const settings = await initSettings();
	const brc = beforeResCutoff(settings, orig.date, getStartTime(settings, orig), orig.category);
	const resType = formData.has('resType')
		? ReservationType[formData.get('resType') as keyof typeof ReservationType]
		: orig.resType;
	const buoy = getBuoy(resType);

	return {
		id: formData.get('id'),
		date: formData.get('date'),
		category: orig.category, //can't be changed
		startTime: formData.has('startTime') ? formData.get('startTime') : orig.startTime,
		endTime: formData.has('endTime') ? formData.get('endTime') : orig.endTime,
		owTime: formData.has('owTime')
			? OWTime[formData.get('owTime') as keyof typeof OWTime]
			: orig.owTime,
		resType,
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
		shortSession: formData.get('shortSession') == 'on',
		createdAt: orig.createdAt,
		owner: true,
		status,
		lanes: brc ? ['auto'] : orig.lanes,
		buoy,
		room: brc ? 'auto' : orig.room,
		price: orig.price,
		updatedAt: new Date(),
		allowAutoAdjust: ['on', 'true'].includes(formData.get('allowAutoAdjust'))
	};
}

export async function modifyReservation(formData: AppFormData) {
	let id = formData.get('id');
	let [orig] = await convertFromXataToAppType([await client.db.Reservations.read(id)]);
	let sub = await unpackModifyForm(formData, orig);
	const settingDate = await getDateSetting(sub.date);

	// check if additional buddy entries need to be created
	// check also if AM open water schedule is full
	// do allow creating of buddy if am schedule is full
	let { create, modify, cancel } = await createBuddyEntriesForUpdate(sub, orig);
	if (settingDate?.ow_am_full && sub.owTime === OWTime.AM) {
		if (create.length > 0) {
			throw new ValidationError('The morning open water session is full for this date cannot add a buddy.');
		} else if (modify.length > 0 && sub.date !== orig.date	) {
			throw new ValidationError('The morning open water session is full for this date cannot change to that date.');
		}
	}

	let existing = [...modify.map((rsv) => rsv.id!), ...cancel];
	await throwIfUpdateIsInvalid(sub, orig, existing, settingDate?.ow_am_full ?? false);

	let records: { [key: string]: Reservation[] } = {
		created: [],
		canceled: []
	};

	if (orig.buoy !== 'auto') {
		modify[0].buoy = orig.buoy;
	}
	if (sub.resType === ReservationType.course && orig.numStudents !== sub.numStudents) {
		modify[0].status = ReservationStatus.pending;
		// enable saving original status for classroom and pool
		if (ReservationCategory.openwater !== sub.category) {
			modify[0].status = orig.status;
		}
	}
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
	let existing = await client.db.Reservations.read(id);

	if (existing!.status != ReservationStatus.canceled) {
		rsv.status = formData.get('status');
	}

	const cat = formData.get('category');
	if (cat === 'pool') {
		rsv.lanes = [formData.get('lane')];
	} else if (cat === 'openwater') {
		rsv.buoy = formData.get('buoy');
	} else if (cat === 'classroom') {
		rsv.room = formData.get('room');
	}

	let record = await client.db.Reservations.update(id, rsv);
	return record;
}

async function throwIfInvalidCancellation(data: Reservation) {
	const settings = await initSettings();
	if (!beforeCancelCutoff(settings, data.date, data.startTime, data.category)) {
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

export async function approveAllPendingReservations(category: ReservationType, date: string) {
	const filters = {
		date,
		category,
		status: ReservationStatus.pending
	};
	console.info('Approving all pending reservations for', category, date);
	const pending = await client.db.Reservations.filter(filters).getAll();
	const approved = pending.map((rsv) => {
		return {
			...rsv,
			status: ReservationStatus.confirmed
		};
	});
	await client.db.Reservations.update(approved);
}
