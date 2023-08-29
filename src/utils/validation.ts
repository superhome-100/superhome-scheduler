import type { ReservationData, Buoy } from '$types';

import { users } from '$lib/stores';
import { get } from 'svelte/store';
import {
	startTimes,
	endTimes,
	beforeResCutoff,
	beforeCancelCutoff
} from '$lib/reservationTimes.js';
import { Settings as settings } from '$lib/settings';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getNumberOfOccupants } from './reservations';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';

export class ValidationError extends Error {}

export function getStartTime(settings: any, sub: ReservationData): string {
	if (sub.category === 'openwater') {
		if (sub.owTime === 'AM') {
			return settings.get('openwaterAmStartTime', sub.date);
		} else if (sub.owTime === 'PM') {
			return settings.get('openwaterPmStartTime', sub.date);
		}
	} else {
		return sub.startTime;
	}
}

const reducingStudents = (orig: ReservationData, sub: ReservationData) =>
	orig.resType === 'course' && orig.numStudents > sub.numStudents;
const removingBuddy = (orig: ReservationData, sub: ReservationData) =>
	orig.buddies.length > sub.buddies.length &&
	sub.buddies.reduce((val, id) => orig.buddies.includes(id) && val, true);

export function throwIfPastUpdateTime(settings: any, orig: ReservationData, sub: ReservationData) {
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

function isMyBuddysReservation(rsv: ReservationData, sub: ReservationData) {
	if (sub.buddies && sub.buddies.includes(rsv?.user?.id!)) {
		if (['pool', 'classroom'].includes(sub.category)) {
			return (
				rsv.category === sub.category &&
				rsv.startTime === sub.startTime &&
				rsv.endTime === sub.endTime
			);
		} else if (sub.category === 'openwater') {
			return rsv.category === sub.category && rsv.owTime === sub.owTime;
		} else {
			throw new ValidationError('invalid category: ' + sub.category);
		}
	} else {
		return false;
	}
}

export function throwIfOverlappingReservation(
	sub: ReservationData,
	allOverlappingRsvs: ReservationData[],
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
	buoys: Buoy[],
	sub: ReservationData,
	existingReservations: ReservationData[]
) {
	let buddyGroup = simulateBuddyGroup(sub);
	let result = assignRsvsToBuoys(buoys, [...buddyGroup, ...existingReservations]);
	if (result.status === 'error') {
		return {
			status: 'error',
			message:
				'All buoys are fully booked at this time.  ' +
				'Please either check back later or try a different date/time'
		};
	} else {
		return result;
	}
}

function checkPoolSpaceAvailable(settings: any, sub: ReservationData, rsvs: ReservationData[]) {
	let startTs = startTimes(settings, sub.date, sub.category);
	for (let i = startTs.indexOf(sub.startTime!); i < startTs.indexOf(sub.endTime); i++) {
		let time = timeStrToMin(startTs[i]);
		let overlap = rsvs.filter((rsv) => {
			let start = timeStrToMin(rsv.startTime!);
			let end = timeStrToMin(rsv.endTime);
			let notMe = sub.id != rsv.id;
			let notMyBuddy = !sub.buddies!.includes(rsv?.user?.id!);
			return notMe && notMyBuddy && start <= time && end > time;
		});
		let mpl = settings.get('maxOccupantsPerLane', sub.date!);
		let numDivers =
			getNumberOfOccupants([sub]) + sub.buddies!.length + getNumberOfOccupants(overlap);
		let nLanes = settings.get('poolLanes', sub.date!).length;
		if (numDivers > nLanes * mpl) {
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
	settings: any,
	sub: ReservationData,
	overlapping: ReservationData[]
) => {
	if (overlapping.length >= settings.get('classrooms', sub.date!).length) {
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

function simulateBuddyGroup(sub: ReservationData) {
	// add fields that db normally adds to this submission and its buddies
	let owner = { ...sub };
	let simId = -1;
	owner.buoy = owner.resType === 'cbs' ? 'CBS' : 'auto';
	owner.id = (simId--).toString();

	let simBuds = [];
	for (let id of owner.buddies || []) {
		let buddies = [owner?.user?.id, ...owner.buddies!.filter((thisId) => thisId != id)];
		simBuds.push({
			...owner,
			id: simId--,
			user: { id },
			buddies
		});
	}
	return [owner, ...simBuds];
}
