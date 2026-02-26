import type { OWReservation, Reservation, Submission } from '$types';
import { ReservationType, ReservationCategory, OWTime } from '$types';

import { getStartEndTimes, beforeResCutoff, beforeCancelCutoff } from '$lib/reservationTimes';
import { getUsersById } from '$lib/server/user';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getNumberOfOccupants } from './reservations';
import { assignRsvsToBuoys } from '$lib/autoAssign';
import { supabaseServiceRole } from '$lib/server/supabase';
import type { Tables } from '$lib/supabase.types';
import type { SettingsManager } from '$lib/settings';

export class ValidationError extends Error { }

export function getStartTime(settings: SettingsManager, sub: Submission): string {
	if (sub.category === ReservationCategory.openwater) {
		if (sub.owTime === OWTime.AM) {
			return settings.getOpenwaterAmStartTime(sub.date);
		} else if (sub.owTime === OWTime.PM) {
			return settings.getOpenwaterPmStartTime(sub.date);
		} else {
			throw new Error('unknown owTime value: ' + sub.owTime);
		}
	} else {
		return sub.startTime;
	}
}

const reducingStudents = (orig: Reservation, sub: Reservation) =>
	orig.resType === ReservationType.course && (orig.numStudents ?? 0) > (sub.numStudents ?? 0);
const removingBuddy = (orig: Reservation, sub: Reservation) =>
	orig.resType === ReservationType.autonomous &&
	orig.buddies.length > sub.buddies.length &&
	sub.buddies.reduce((val, id) => orig.buddies.includes(id) && val, true);
const changingCourseToAutonomous = (orig: Reservation, sub: Reservation) =>
	orig.resType == ReservationType.course &&
	sub.resType == ReservationType.autonomous &&
	sub.buddies.length == 0;

export function throwIfPastUpdateTime(
	settings: SettingsManager,
	orig: Reservation,
	sub: Reservation
) {
	let startTime = getStartTime(settings, sub);
	if (!beforeResCutoff(settings, sub.date, startTime, sub.category as ReservationCategory)) {
		//the only types of mods that are allowed after the res cutoff are:
		// 1) reducing the number of students in a course
		// 2) deleting a buddy's reservation
		// 3) changing a course to an autonomous reservation type

		const cutoffError =
			'The modification window for this reservation date/time has expired; this reservation can no longer be modified';

		if (
			!reducingStudents(orig, sub) &&
			!removingBuddy(orig, sub) &&
			!changingCourseToAutonomous(orig, sub)
		) {
			throw new ValidationError(cutoffError);
		} else if (
			!beforeCancelCutoff(settings, sub.date, startTime, sub.category as ReservationCategory)
		) {
			//no mods allowed after cancel cutoff
			throw new ValidationError(cutoffError);
		}
	}
}

function isMyBuddysReservation(rsv: Reservation, sub: Submission) {
	if (sub.buddies && rsv.user && sub.buddies.includes(rsv.user)) {
		if (
			[ReservationCategory.pool, ReservationCategory.classroom].includes(
				sub.category as ReservationCategory
			)
		) {
			return (
				rsv.category === sub.category &&
				rsv.startTime === sub.startTime &&
				rsv.endTime === sub.endTime
			);
		} else if (sub.category === ReservationCategory.openwater) {
			return rsv.category === sub.category && rsv.owTime === sub.owTime;
		} else {
			throw new Error('invalid category: ' + sub.category);
		}
	} else {
		return false;
	}
}

export function throwIfOverlappingReservation(
	sub: Reservation,
	allOverlappingRsvs: Reservation[],
	userIds: string[]
) {
	let userOverlapping = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user));
	for (let rsv of userOverlapping) {
		let notThisRsv = rsv.id !== sub.id;
		let notBuddyOfThisRsv = !isMyBuddysReservation(rsv, sub);
		if (notThisRsv && notBuddyOfThisRsv) {
			throw new ValidationError(
				'You or one of your buddies has a pre-existing reservation at this time'
			);
		}
	}
}

export function checkOWSpaceAvailable(
	buoys: Tables<'Buoys'>[],
	sub: Submission,
	existingReservations: OWReservation[]
) {
	let buddyGroup = simulateBuddyGroup(sub);
	let { unassigned } = assignRsvsToBuoys(buoys, [...buddyGroup, ...existingReservations]);
	if (unassigned.length > 0) {
		return {
			status: 'error',
			message:
				'All buoys are fully booked at this time.  ' +
				'Please either check back later or try a different date/time'
		};
	} else {
		return { status: 'success' };
	}
}

export function checkPoolSpaceAvailable(
	settings: SettingsManager,
	sub: Submission,
	overlapping: Reservation[]
) {
	const nLanes = settings.getPoolLanes(sub.date).length;
	const startEndTs = getStartEndTimes(settings, sub.date, sub.category as ReservationCategory);
	for (let i = startEndTs.indexOf(sub.startTime); i < startEndTs.indexOf(sub.endTime); i++) {
		let time = timeStrToMin(startEndTs[i]);
		let thisSlotOverlap = overlapping.filter((rsv) => {
			let start = timeStrToMin(rsv.startTime);
			let end = timeStrToMin(rsv.endTime);
			return start <= time && end > time;
		});
		let numDivers = getNumberOfOccupants([...thisSlotOverlap, sub]) + (sub.buddies?.length ?? 0);

		if (numDivers > nLanes) {
			return {
				status: 'error',
				message:
					'All pool lanes are booked at this time.  ' +
					'Please either check back later or try a different date/time'
			};
		}
	}
	return { status: 'success' };
}

export const checkClassroomAvailable = (
	settings: SettingsManager,
	sub: Submission,
	overlapping: Reservation[]
) => {
	if (overlapping.length >= settings.getClassrooms(sub.date).length) {
		return {
			status: 'error',
			message:
				'All classrooms are booked at this time.  ' +
				'Please either check back later or try a different date/time'
		};
	} else {
		return { status: 'success' };
	}
};

function simulateBuddyGroup(sub: Submission) {
	// add fields that db normally adds to this submission and its buddies
	let simId = -1;
	let owner = {
		...sub,
		id: (simId--).toString(),
		buoy: sub.resType === ReservationType.cbs ? 'CBS' : 'auto'
	};

	let simBuds = [];
	for (let id of owner.buddies) {
		let buddies = [owner.user, ...owner.buddies.filter((thisId) => thisId != id)];
		simBuds.push({
			...owner,
			id: simId--,
			user: { id },
			buddies
		});
	}
	return [owner, ...simBuds];
}

export const throwIfUserIsDisabled = async (userIds: string[]) => {
	const users = await getUsersById(userIds);
	users.forEach((user) => {
		if (user == null) throw new Error('invalid user Id');
		if (user.status === 'disabled') {
			throw new ValidationError(
				`Please contact the admin to activate the account for ${user.nickname}`
			);
		}
	});
};

export async function throwIfNoSpaceAvailable(
	settings: SettingsManager,
	sub: Submission,
	allOverlappingRsvs: Reservation[],
	ignore: string[] = []
) {
	let result;
	let catOverlapping = allOverlappingRsvs
		.filter((rsv) => rsv.category === sub.category && !ignore.includes(rsv.id))
		.map((rsv) => {
			return { ...rsv };
		}); // remove const

	if (sub.category === ReservationCategory.openwater) {
		const { data: buoys } = await supabaseServiceRole
			.from('Buoys')
			.select('*')
			.throwOnError();
		result = checkOWSpaceAvailable(buoys, sub, catOverlapping);
	} else if (sub.category === ReservationCategory.pool) {
		result = checkPoolSpaceAvailable(settings, sub, catOverlapping);
	} else if (sub.category === ReservationCategory.classroom) {
		result = checkClassroomAvailable(settings, sub, catOverlapping);
	} else {
		throw new Error(`invalid category ${sub.category}`);
	}
	if (result.status === 'error') {
		throw new ValidationError(result.message);
	}
}
