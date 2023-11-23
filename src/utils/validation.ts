import type { Reservation, Submission } from '$types';
import type { BuoysRecord } from '$lib/server/xata.codegen';
import { ReservationType, ReservationCategory, OWTime } from '$types';

import { getStartEndTimes, beforeResCutoff, beforeCancelCutoff } from '$lib/reservationTimes.js';
import { getUsersById } from '$lib/server/user';
import type { SettingsManager } from '$lib/client/settings';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getNumberOfOccupants } from './reservations';
import { assignRsvsToBuoys } from '$lib/autoAssign';
import { getXataClient } from '$lib/server/xata-old';

export class ValidationError extends Error {}

const client = getXataClient();

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
	orig.resType === ReservationType.course && orig.numStudents > sub.numStudents;
const removingBuddy = (orig: Reservation, sub: Reservation) =>
	orig.resType === ReservationType.autonomous &&
	orig.buddies.length > sub.buddies.length &&
	sub.buddies.reduce((val, id) => orig.buddies.includes(id) && val, true);

export function throwIfPastUpdateTime(
	settings: SettingsManager,
	orig: Reservation,
	sub: Reservation
) {
	let startTime = getStartTime(settings, sub);
	if (!beforeResCutoff(settings, sub.date, startTime, sub.category)) {
		//the only types of mods that are allowed after the res cutoff are:
		// 1) reducing the number of students in a course
		// 2) deleting a buddy's reservation

		const cutoffError =
			'The modification window for this reservation date/time has expired; this reservation can no longer be modified';

		if (!reducingStudents(orig, sub) && !removingBuddy(orig, sub)) {
			throw new ValidationError(cutoffError);
		} else if (!beforeCancelCutoff(settings, sub.date, startTime, sub.category)) {
			//no mods allowed after cancel cutoff
			throw new ValidationError(cutoffError);
		}
	}
}

function isMyBuddysReservation(rsv: Reservation, sub: Submission) {
	if (sub.buddies && sub.buddies.includes(rsv.user.id)) {
		if ([ReservationCategory.pool, ReservationCategory.classroom].includes(sub.category)) {
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
	let userOverlapping = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user.id));
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
	buoys: BuoysRecord[],
	sub: Submission,
	existingReservations: Reservation[]
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
	let startEndTs = getStartEndTimes(settings, sub.date, sub.category);
	for (let i = startEndTs.indexOf(sub.startTime); i < startEndTs.indexOf(sub.endTime); i++) {
		let time = timeStrToMin(startEndTs[i]);
		let thisSlotOverlap = overlapping.filter((rsv) => {
			let start = timeStrToMin(rsv.startTime);
			let end = timeStrToMin(rsv.endTime);
			return start <= time && end > time;
		});
		let numDivers = getNumberOfOccupants([...thisSlotOverlap, sub]) + sub.buddies.length;
		let nLanes = settings.getPoolLanes(sub.date).length;
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
		let buddies = [owner.user.id, ...owner.buddies.filter((thisId) => thisId != id)];
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
	users.map((user) => {
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
		let buoys = await client.db.Buoys.getAll();
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
