import type {
	AppFormData,
	Reservation,
	ReservationCreationFormUnpacked,
	ReservationModifyingFormUnpacked,
	Submission,
	User
} from '$types';
import type { Tables, TablesInsert, TablesUpdate } from '$lib/supabase.types';
import { ReservationCategory, ReservationStatus, ReservationType, OWTime } from '$types';
import { timeStrToMin, isValidProSafetyCutoff } from '$lib/datetimeUtils';
import { getTimeOverlapSupabaseFilter } from '$utils/reservation-queries';
import { initSettings, type SettingsManager } from './settings';
import { getDateSetting } from '$lib/firestore';
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
import Papa from 'papaparse';
import { supabaseServiceRole } from './supabase';
import { pushNotificationService } from './push';


export async function getReservationsCsv() {
	// download all rsvs from the 1st day of the previous month
	const dateStr = dayjs()
		.month(dayjs().month() - 1)
		.startOf('month')
		.locale('en-US')
		.format('YYYY-MM-DD');
	const { data: records } = await supabaseServiceRole
		.from('Reservations')
		.select('*, Users!left(name, nickname)')
		.gte('date', dateStr)
		.throwOnError();

	// conveniences for the admins:
	//  set numStudents = 1 for autonomous bookings
	//  set owTime for pool/classroom based on whether startTime is in AM or PM
	const recordsEx = records.map((rsv) => {
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

	const csv = Papa.unparse(
		recordsEx.map((ent) => {
			return {
				..._.omit(ent, ['Users']),
				name: ent.Users.name ?? 'no name',
				nickname: ent.Users.nickname ?? 'no name',
			};
		})
	);
	return await csv.toString();
}

const throwIfNull = (rsv: Tables<'Reservations'>, field: keyof Tables<'Reservations'>) => {
	if (rsv[field] == null) {
		throw new Error(`invalid null value for ${field} in reservation ${rsv.id}`);
	}
};

// sanity check that the reservation record coming from xata is valid:
//     assert that enum types have valid values,
//     and that fields that shouldn't be null are not null
function throwIfReservationIsInvalid(
	rsv: Tables<'Reservations'>
): asserts rsv is Tables<'Reservations'> {
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
}

/**
 * This function only does some sanoty check but does not change the structure anymore
 */
export async function convertFromXataToAppType(
	rawRsvs: Tables<'Reservations'>[]
): Promise<Reservation[]> {
	// make sure it's safe to cast to the Reservation type
	rawRsvs.forEach((rsv) => throwIfReservationIsInvalid(rsv));
	return rawRsvs;
}

export async function getReservationsSince(minDateStr: string) {
	//note: we include rejected and canceled rsvs here so that:
	//  - [rejected rsvs]: users can see which of their rsvs have been rejected
	//  in MyReservations page
	//  - [canceled rsvs]: when app state is refreshed, clients can detect when other
	//  users have canceled an rsv and remove it from their cache
	const { data: rawRsvs } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.gte('date', minDateStr)
		.order('date', { ascending: true })
		.throwOnError();
	const reservations = await convertFromXataToAppType(rawRsvs);
	return reservations;
}

export function categoryIsBookable(
	settings: SettingsManager,
	sub: TablesUpdate<'Reservations'>
): boolean {
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

async function getOverlappingReservations(sub: Reservation) {
	const settings = await initSettings();
	const { data } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.eq('date', sub.date)
		.or(getTimeOverlapSupabaseFilter(settings, sub))
		.in('status', [ReservationStatus.pending, ReservationStatus.confirmed])
		.throwOnError();
	return await convertFromXataToAppType(data);
}

async function getUserOverlappingReservations(sub: Reservation, userIds: string[]) {
	let overlapping = await getOverlappingReservations(sub);
	return overlapping.filter((rsv) => userIds.includes(rsv.user));
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

	let userIds = [sub.user, ...(sub.buddies ?? [])];

	await throwIfUserIsDisabled(userIds);

	if (sub.resType === 'proSafety') {
		const isValid = isValidProSafetyCutoff(sub.date);
		if (!isValid) throw new ValidationError('PRO_SAFETY reservation should be done before 4PM.');
	}

	if (
		!beforeResCutoff(
			settings,
			sub.date,
			getStartTime(settings, sub),
			sub.category as ReservationCategory
		)
	) {
		throw new ValidationError(
			'The submission window for this reservation date/time has expired. Please choose a later date.'
		);
	}

	let allOverlappingRsvs = await getOverlappingReservations(sub);

	let userOverlappingRsvs = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user));
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
			sub.resType as ReservationType
		)
	) {
		// ITS NOW AVAILABLE
		// if (competitionSetupDays.includes(day)) {
		// 	throw new ValidationError('This training type is not available during Tuesdays and Fridays');
		// }
		if (sub.buddies.length < 2) {
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
	if ((sub.buddies ?? []).length > 0) {
		let { user, buddies, ...common } = sub;
		for (let id of buddies ?? []) {
			let bg = [user, ...(buddies ?? []).filter((bid: string) => bid != id)];
			entries.push({ ...common, user: id, buddies: bg, owner: false });
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

function unpackSubmitForm(
	user_id: string,
	formData: AppFormData,
	settings: SettingsManager
): ReservationCreationFormUnpacked & { owTime: string } {
	const category =
		ReservationCategory[formData.get('category') as keyof typeof ReservationCategory];
	const status =
		category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;
	const resType = ReservationType[formData.get('resType') as keyof typeof ReservationType];
	const buoy = getBuoy(resType);
	const date = formData.get('date');
	const owTime = OWTime[formData.get('owTime') as keyof typeof OWTime];
	let startTime = formData.get('startTime');
	let endTime = formData.get('endTime');
	if (category === ReservationCategory.openwater) {
		if (owTime === OWTime.AM) {
			startTime = settings.getOpenwaterAmStartTime(date);
			endTime = settings.getOpenwaterAmEndTime(date);
		} else if (owTime === OWTime.PM) {
			startTime = settings.getOpenwaterPmStartTime(date);
			endTime = settings.getOpenwaterPmEndTime(date);
		} else {
			throw Error(`Unexpected OW time ${owTime}`);
		}
	}
	return {
		user: user_id,
		date,
		category,
		resType,
		buddies: JSON.parse(formData.get('buddies')),
		comments: formData.get('comments'),
		numStudents: JSON.parse(formData.get('numStudents')),
		startTime,
		endTime,
		owTime,
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

export async function submitReservation(
	actor: User,
	formData: AppFormData,
	settings: SettingsManager
) {
	const sub = unpackSubmitForm(actor.id, formData, settings);
	await throwIfSubmissionIsInvalid(sub);
	await checkEventFull(sub.date, sub.owTime);

	const entries = createBuddyEntriesForSubmit(sub);
	await supabaseServiceRole
		.from('Reservations')
		.insert(entries)
		.throwOnError();
}

async function throwIfUpdateIsInvalid(
	sub: ReservationModifyingFormUnpacked,
	orig: Tables<'Reservations'>,
	ignore: string[],
	isAMFull: boolean
) {
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
	let userIds = [sub.user, ...(sub.buddies ?? [])];
	throwIfOverlappingReservation(orig, allOverlappingRsvs, userIds);

	// check if course and type ow, retrieve if day is ow am is full
	if (sub.resType === ReservationType.course && sub.category === ReservationCategory.openwater) {
		if (isAMFull && (sub.numStudents ?? 0) > (orig.numStudents ?? 0) && sub.owTime === OWTime.AM) {
			throw new ValidationError(
				'The morning open water session is full for this date cannot increase the number of students.'
			);
		}
	}

	await throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs, ignore);
}

async function createBuddyEntriesForUpdate(
	sub: ReservationModifyingFormUnpacked,
	orig: Reservation
): Promise<{
	modify: TablesUpdate<'Reservations'>[];
	create: TablesInsert<'Reservations'>[];
	cancel: string[];
}> {
	// create set of all buddies, including the original group and the updated group
	const buddySet = new Set([...sub.buddies, ...orig.buddies]);

	const modify: TablesUpdate<'Reservations'>[] = [sub];
	const create: TablesInsert<'Reservations'>[] = [];
	const cancel: string[] = [];

	if (buddySet.size > 0) {
		let rsvIdByUserId: { [key: string]: string } = {};
		let {
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			id,
			user,
			buddies,
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			status,
			...common
		} = sub;

		if (orig.buddies.length > 0) {
			let buddyRsvs = await getUserOverlappingReservations(orig, orig.buddies);
			rsvIdByUserId = buddyRsvs.reduce((obj: typeof rsvIdByUserId, rsv: Reservation) => {
				obj[rsv.user!] = rsv.id!;
				return obj;
			}, {});
		}

		const getBuddyField = (myId: string): string[] => [
			user!,
			...buddies.filter((bId: string) => bId != myId)
		];
		for (let bId of buddySet) {
			if (buddies.includes(bId) && orig.buddies.includes(bId)) {
				// modify
				let entry: TablesUpdate<'Reservations'> = {
					...common,
					id: rsvIdByUserId[bId],
					user: bId,
					buddies: getBuddyField(bId),
					owner: false
				};
				modify.push(entry);
			} else if (buddies.includes(bId)) {
				// create
				let entry: TablesInsert<'Reservations'> = {
					...common,
					user: bId,
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

async function unpackModifyForm(
	formData: AppFormData,
	orig: Reservation
): Promise<ReservationModifyingFormUnpacked> {
	const status =
		orig.category == ReservationCategory.openwater
			? ReservationStatus.pending
			: ReservationStatus.confirmed;

	const settings = await initSettings();
	const brc = beforeResCutoff(
		settings,
		orig.date,
		getStartTime(settings, orig),
		orig.category as ReservationCategory
	);
	const resType = formData.has('resType')
		? ReservationType[formData.get('resType') as keyof typeof ReservationType]
		: orig.resType;
	const buoy = getBuoy(resType as ReservationType);

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
		updatedAt: orig.updatedAt,
		allowAutoAdjust: ['on', 'true'].includes(formData.get('allowAutoAdjust'))
	};
}

const checkEventFull = async (date: Date | string, owTime: string) => {
	const [settingDate] = await getDateSetting(supabaseServiceRole, date);
	if (owTime === OWTime.AM) {
		if (settingDate?.ow_am_full) {
			throw new ValidationError(
				'The morning open water session is full for this date.'
			);
		}
	}
}

export async function modifyReservation(actor: User, formData: AppFormData) {
	const id = formData.get('id');
	const { data } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.eq('id', id)
		.single()
		.throwOnError();
	if (!(data.user === actor.id || actor.privileges === 'admin'))
		throw Error(`unathorised reservation modification ${id} by ${actor.id}`);
	let [orig] = await convertFromXataToAppType([data]);
	let sub = await unpackModifyForm(formData, orig);
	const [settingDate] = await getDateSetting(supabaseServiceRole, sub.date);

	// check if additional buddy entries need to be created
	// check also if AM open water schedule is full
	// do allow creating of buddy if am schedule is full
	let { create, modify, cancel } = await createBuddyEntriesForUpdate(sub, orig);
	if (settingDate?.ow_am_full && sub.owTime === OWTime.AM) {
		if (create.length > 0) {
			throw new ValidationError(
				'The morning open water session is full for this date cannot add a buddy.'
			);
		} else if (modify.length > 0 && (sub.date !== orig.date || orig.owTime !== sub.owTime)) {
			throw new ValidationError(
				'The morning open water session is full for this date cannot change to that date or time.'
			);
		}
	}

	let existing = [...modify.map((rsv) => rsv.id!), ...cancel];
	await throwIfUpdateIsInvalid(sub, orig, existing, settingDate?.ow_am_full ?? false);

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
	const modrecs: Tables<'Reservations'>[] = [];
	const errors: Error[] = [];
	for (const m of modify) {
		const { data, error } = await supabaseServiceRole
			.from('Reservations')
			.update(m)
			.eq("id", m.id!)
			.select('*')
			.single();
		if (error) errors.push(error);
		else modrecs.push(data);
	}

	if (create.length > 0) {
		let { data: createrecs, error } = await supabaseServiceRole
			.from('Reservations')
			.insert(create)
			.select('*');
		if (error) errors.push(error);
		else if (createrecs === null) errors.push(Error(`createrecs is null for ${create}`));
	}

	if (cancel.length > 0) {
		const { error } = await supabaseServiceRole
			.from('Reservations')
			.update({ status: ReservationStatus.canceled })
			.in("id", cancel);
		if (error) errors.push(error);
	}

	if (errors.length > 0)
		throw Error(`Error during modifying reservation ${id} ${sub}: ${JSON.stringify(errors)}`);
}

export async function adminUpdate(formData: AppFormData) {
	let rsv: Partial<Tables<'Reservations'>> = {};

	let id = formData.get('id');
	let { data: existing } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.eq('id', id)
		.single()
		.throwOnError();
	if (existing === null) throw Error(`reservation ${id} does not exists (anymore?).`);
	if (existing.status != ReservationStatus.canceled) {
		rsv.status = formData.get('status') as ReservationStatus;
	}

	const cat = formData.get('category');
	if (cat === 'pool') {
		rsv.lanes = [formData.get('lane')];
	} else if (cat === 'openwater') {
		rsv.buoy = formData.get('buoy');
	} else if (cat === 'classroom') {
		rsv.room = formData.get('room');
	}

	const { data } = await supabaseServiceRole
		.from('Reservations')
		.update(rsv)
		.eq("id", id)
		.select('*')
		.single()
		.throwOnError();

	await pushNotificationService.send(existing.user, `${existing.category} reservation: ${rsv.status}!`, `for ${existing.date} - ${existing.startTime}`)

	return { record: data };
}

async function throwIfInvalidCancellation(data: Tables<'Reservations'>) {
	const settings = await initSettings();
	if (!data.startTime) throw Error(`startTime is required now ${data}`); // old code was silently fail
	if (
		!beforeCancelCutoff(settings, data.date, data.startTime, data.category as ReservationCategory)
	) {
		throw new ValidationError(
			'The cancellation window for this reservation has expired; this reservation can no longer be canceled'
		);
	}
}

export async function cancelReservation(actor: User, formData: AppFormData) {
	let id = formData.get('id');
	let buddiesToCancel = JSON.parse(formData.get('cancelBuddies'));
	const { data } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.eq('id', id)
		.single()
		.throwOnError();
	if (!(data.user === actor.id || actor.privileges === 'admin'))
		throw Error(`unathorised reservation cancellation ${id} by ${actor.id}`);
	let [sub] = await convertFromXataToAppType([data]);

	await throwIfInvalidCancellation(sub);

	let save = sub.buddies.filter((id: string) => !buddiesToCancel.includes(id));
	let cancel = [sub.id];
	const errors: { id: string; error: Error }[] = [];

	if (sub.buddies.length > 0) {
		let existing = await getUserOverlappingReservations(sub, sub.buddies);
		let modify = existing
			.filter((rsv) => save.includes(rsv.user))
			.map((rsv) => {
				let buddies = save.filter((id: string) => id != rsv.user);
				return { ...rsv, buddies };
			});
		if (modify.length > 0) {
			if (modify.reduce((b, rsv) => b || rsv.owner, false) == false) {
				// make sure one of the existing rsvs is the owner
				// doesn't matter which, as long as there is exactly
				// one owner
				modify[0].owner = true;
			}
			const modrecs: Tables<'Reservations'>[] = [];
			for (const m of modify) {
				const { data, error } = await supabaseServiceRole
					.from('Reservations')
					.update(m)
					.eq('id', m.id)
					.select('*')
					.single();
				if (error) errors.push({ id: m.id, error });
				else modrecs.push(data);
			}
		}

		cancel = cancel.concat(existing.filter((rsv) => !save.includes(rsv.user)).map((rsv) => rsv.id));
	}
	{
		const { error } = await supabaseServiceRole
			.from('Reservations')
			.update({ status: ReservationStatus.canceled })
			.in('id', cancel);
		if (error) errors.push({ id, error });
	}
	if (errors.length)
		throw Error(`Error during cancelling reservations: ${JSON.stringify(errors)}`);
}

export async function approveAllPendingReservations(category: ReservationType, date: string) {
	console.info('Approving all pending reservations for', category, date);
	await supabaseServiceRole
		.from('Reservations')
		.update({ status: ReservationStatus.confirmed })
		.eq('date', date)
		.eq('category', category)
		.eq('status', ReservationStatus.pending)
		.throwOnError();
}
