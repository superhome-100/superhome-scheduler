import { timeStrToMin } from '$lib/datetimeUtils';
import { startTimes } from '$lib/reservationTimes.js';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';

import { getOverlappingReservations } from '$utils/validation'

export const nOccupants = (rsvs) =>
	rsvs.reduce((n, rsv) => {
		if (rsv.category === 'classroom') {
			return n + rsv.numStudents;
		} else {
			return rsv.resType === 'course' ? n + 2 * Math.ceil(rsv.numStudents / 2) : n + 1;
		}
	}, 0);

function checkPoolSpaceAvailable(sub, rsvs, settings) {
	let startTs = startTimes(settings, sub.date, sub.category);
	for (let i = startTs.indexOf(sub.startTime); i < startTs.indexOf(sub.endTime); i++) {
		let time = timeStrToMin(startTs[i]);
		let overlap = rsvs.filter((rsv) => {
			let start = timeStrToMin(rsv.startTime);
			let end = timeStrToMin(rsv.endTime);
			let notMe = sub.id != rsv.id;
			let notMyBuddy = !sub.buddies.includes(rsv.user.id);
			return notMe && notMyBuddy && start <= time && end > time;
		});
		let mpl = settings.get('maxOccupantsPerLane', sub.date);
		let numDivers = nOccupants([sub]) + sub.buddies.length + nOccupants(overlap);
		let nLanes = settings.get('poolLanes', sub.date).length;
		if (numDivers > nLanes * mpl) {
			return false;
		}
	}
	return true;
}

function simulateDiveGroup(sub, existing) {
	// remove current user and buddies in case this is a modification
	// to an existing reservation
	existing = existing.filter((rsv) => {
		return rsv.user.id !== sub.id && !sub.buddies.includes(rsv.user.id);
	});

	// add fields that db normally adds to this submission and its buddies
	let owner = { ...sub };
	let simId = -1;
	owner.buoy = owner.resType === 'cbs' ? 'CBS' : 'auto';
	owner.id = simId--;
	owner.user = { id: owner.user };
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
	return [owner, ...simBuds, ...existing];
}

export function checkSpaceAvailable(settings, buoys, sub, existing) {
	let overlapping = getOverlappingReservations(sub, existing).filter(
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
		if (checkPoolSpaceAvailable(sub, overlapping, settings)) {
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
		overlapping = overlapping.filter((rsv) => rsv.user.id != sub.user);
		if (overlapping.length >= settings.get('classrooms', sub.date).length) {
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

export function buddysRsv(rsv, sub) {
	if (sub.buddies && sub.buddies.includes(rsv.user.id)) {
		if (['pool', 'classroom'].includes(sub.category)) {
			return (
				rsv.category === sub.category &&
				rsv.startTime === sub.startTime &&
				rsv.endTime === sub.endTime
			);
		} else if (sub.category === 'openwater') {
			return rsv.category === sub.category && rsv.owTime === sub.owTime;
		} else {
			throw new Error();
		}
	} else {
		return false;
	}
}

export function checkNoOverlappingRsvs(settings, orig, sub, existing) {
	let userIds = [sub.user, ...sub.buddies];
	let overlapping = getOverlappingReservations(sub, existing);
	for (let rsv of overlapping) {
		if (rsv.id != sub.id && !buddysRsv(rsv, orig) && userIds.includes(rsv.user.id)) {
			return {
				status: 'error',
				msg: 'You or one of your buddies has an existing reservation at this time'
			};
		}
	}
	return { status: 'success' };
}
