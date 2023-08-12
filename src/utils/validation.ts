import type { ReservationData, Buoy } from '$types';

import { users } from '$lib/stores';
import { get } from 'svelte/store';
import { startTimes, endTimes } from '$lib/reservationTimes.js';

import { Settings as settings } from '$lib/settings';
import { timeStrToMin } from '$lib/datetimeUtils';
import { getNumberOfOccupants } from './reservations';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';

export function validateBuddies(rsv: ReservationData) {
	let userIds = Object.keys(get(users));
	let validBuddies: string[] = [];
	for (let buddy of rsv.buddies || []) {
		if (rsv?.user?.id === buddy) {
			return { status: 'error', msg: 'Cannot add yourself as a buddy' };
		}
		if (!userIds.includes(buddy)) {
			return { status: 'error', msg: 'Unknown user in buddy field' };
		}
		if (validBuddies.includes(buddy)) {
			return { status: 'error', msg: 'Duplicate buddies not allowed' };
		}
		validBuddies.push(buddy);
	}
	return { status: 'success' };
}

export function getOverlappingReservations(sub: ReservationData, rsvs: ReservationData[]) {
	return rsvs.filter((rsv) => {
		return (
			rsv.date === sub.date &&
			['pending', 'confirmed'].includes(rsv.status) &&
			getTimeOverlapFilters(sub).reduce((b, f) => b || f(rsv), false)
		);
	});
}

export function checkNoOverlappingRsvs(
	orig: ReservationData,
	sub: ReservationData,
	existingReservations: ReservationData[]
) {
	let userIds = [sub.user, ...sub.buddies!];
	let overlapping = getOverlappingReservations(sub, existingReservations);
	for (let rsv of overlapping) {
		if (rsv.id != sub.id && !isBuddiesReservation(rsv, orig) && userIds.includes(rsv?.user?.id)) {
			return {
				status: 'error',
				msg: 'You or one of your buddies has an existing reservation at this time'
			};
		}
	}
	return { status: 'success' };
}

// TOOD: probably needs a clearer name?
export function isBuddiesReservation(rsv: ReservationData, sub: ReservationData) {
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
			// TODO: add error message? whats the problem?
			throw new Error();
		}
	} else {
		return false;
	}
}

export function checkSpaceAvailable(
	buoys: Buoy[],
	sub: ReservationData,
	existingReservations: ReservationData[]
) {
	let overlapping = getOverlappingReservations(sub, existingReservations).filter(
		(rsv) => rsv.category === sub.category
	);
	if (sub.category === 'openwater') {
		let diveGroup = simulateDiveGroup(sub, overlapping);
		let result = assignRsvsToBuoys(buoys, diveGroup);
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
	} else if (sub.category === 'pool') {
		if (checkPoolSpaceAvailable(sub, overlapping)) {
			return { status: 'success' };
		} else {
			return {
				status: 'error',
				message:
					'All pool lanes are booked at this time.  ' +
					'Please either check back later or try a different date/time'
			};
		}
	} else if (sub.category === 'classroom') {
		overlapping = overlapping.filter((rsv) => rsv?.user?.id != sub.user);
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
	}
}

function checkPoolSpaceAvailable(sub: ReservationData, rsvs: ReservationData[]) {
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
			return false;
		}
	}
	return true;
}

// TODO: fix this seems to return non-uniform ReservationData[]
function simulateDiveGroup(sub: ReservationData, existingReservations: ReservationData[]) {
	// remove current user and buddies in case this is a modification
	// to an existing reservation
	const reservations = existingReservations.filter((rsv) => {
		return rsv?.user?.id !== sub.id && !sub.buddies!.includes(rsv?.user?.id!);
	});

	// add fields that db normally adds to this submission and its buddies
	let owner = { ...sub };
	let simId = -1;
	owner.buoy = owner.resType === 'cbs' ? 'CBS' : 'auto';
	owner.id = (simId--).toString();

	// @ts-ignore dont know why this is needed
	owner.user = { id: owner.user };

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
	return [owner, ...simBuds, ...reservations];
}

// TODO: document what this does
function getTimeOverlapFilters(rsv: ReservationData) {
	let owAmStart = settings.get('openwaterAmStartTime', rsv.date!);
	let owAmEnd = settings.get('openwaterAmEndTime', rsv.date!);
	let owPmStart = settings.get('openwaterPmStartTime', rsv.date!);
	let owPmEnd = settings.get('openwaterPmEndTime', rsv.date!);
	let start, end;
	let owTimes: string[] = [];
	if (['pool', 'classroom'].includes(rsv.category)) {
		start = rsv.startTime;
		end = rsv.endTime;
		if (
			isTimeOverlapping({
				startA: start!,
				endA: end,
				startB: owAmStart,
				endB: owAmEnd
			})
		) {
			owTimes.push('AM');
		}
		if (
			isTimeOverlapping({
				startA: start!,
				endA: end,
				startB: owPmStart,
				endB: owPmEnd
			})
		) {
			owTimes.push('PM');
		}
	} else if (rsv.category === 'openwater') {
		owTimes.push(rsv.owTime!);
		if (rsv.owTime === 'AM') {
			start = owAmStart;
			end = owAmEnd;
		} else if (rsv.owTime === 'PM') {
			start = owPmStart;
			end = owPmEnd;
		}
	}

	const filters: ((rsv: ReservationData) => boolean)[] = [];

	if (owTimes.length > 0) {
		filters.push((rsv) => rsv.category === 'openwater' && owTimes.includes(rsv.owTime!));
	}

	let slots = getTimeSlots({
		date: rsv.date!,
		category: 'pool',
		start,
		end
	});
	if (slots) {
		let timeFilt: ((rsv: ReservationData) => boolean)[] = [];
		if (slots.startVals.length > 0) {
			timeFilt.push((rsv) => slots!.startVals.includes(rsv.startTime!));
		}
		if (slots.endVals.length > 0) {
			timeFilt.push((rsv) => slots!.endVals.includes(rsv.endTime));
		}
		if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
			timeFilt.push(
				(rsv) =>
					slots!.beforeStart.includes(rsv.startTime!) && slots!.afterEnd.includes(rsv.endTime)
			);
		}
		filters.push(
			(rsv) =>
				['pool', 'classroom'].includes(rsv.category) &&
				timeFilt.reduce((b, f) => b || f(rsv), false)
		);
	}
	return filters;
}

function getTimeSlots({
	date,
	category,
	start,
	end
}: {
	date: string;
	category: 'pool';
	start: string;
	end: string;
}) {
	let sTs = startTimes(settings, date, category);
	let eTs = endTimes(settings, date, category);
	let times = [...sTs, eTs[eTs.length - 1]];

	let sIdx = times.indexOf(start);
	let eIdx = times.indexOf(end);
	if (sIdx == -1 && eIdx == -1) {
		return null;
	}

	if (sIdx == -1) {
		sIdx = 0;
	}
	if (eIdx == -1) {
		eIdx = times.length - 1;
	}

	let beforeStart = times.slice(0, sIdx);
	let startVals = times.slice(sIdx, eIdx);

	let endVals = times.slice(sIdx + 1, eIdx + 1);
	let afterEnd = times.slice(eIdx + 1);

	return { startVals, endVals, beforeStart, afterEnd };
}

function isTimeOverlapping({
	startA,
	endA,
	startB,
	endB
}: {
	startA: string;
	endA: string;
	startB: string;
	endB: string;
}): boolean {
	const startAMin = timeStrToMin(startA);
	const startBMin = timeStrToMin(startB);
	const endAMin = timeStrToMin(endA);
	const endBMin = timeStrToMin(endB);
	return (
		(startAMin >= startBMin && startAMin < endBMin) ||
		(endAMin <= endBMin && endAMin > startBMin) ||
		(startAMin < startBMin && endAMin > endBMin)
	);
}
