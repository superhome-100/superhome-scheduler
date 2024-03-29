import type { Submission } from '$types';
import type { SettingsManager } from '$lib/client/settings';
import { OWTime, ReservationCategory } from '$types';
import { getStartEndTimes } from '$lib/reservationTimes';
import { timeStrToMin } from '$lib/datetimeUtils';

// helper for getTimeOverlapFilters: sorts all possible start and end times into four groups:
// those that occur before, after, and during (two groups for start and end vals) the given start/end times
function getTimeSlots({
	settings,
	date,
	category,
	start,
	end
}: {
	settings: SettingsManager;
	date: string;
	category: ReservationCategory;
	start: string;
	end: string;
}) {
	let times = getStartEndTimes(settings, date, category);
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

// return true if an rsv with start=startA and end=endA overlaps in time with another rsv with
// start=startB and end=endB
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

// return xata filters for querying all reservations that overlap in time with the given reservation
// note: this searches across all categories
export function getTimeOverlapFilters(settings: SettingsManager, rsv: Submission) {
	let owAmStart = settings.getOpenwaterAmStartTime(rsv.date);
	let owAmEnd = settings.getOpenwaterAmEndTime(rsv.date);
	let owPmStart = settings.getOpenwaterPmStartTime(rsv.date);
	let owPmEnd = settings.getOpenwaterPmEndTime(rsv.date);
	let start, end;
	let owTimes: OWTime[] = [];
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(rsv.category)) {
		start = rsv.startTime;
		end = rsv.endTime;
		if (
			isTimeOverlapping({
				startA: start,
				endA: end,
				startB: owAmStart,
				endB: owAmEnd
			})
		) {
			owTimes.push(OWTime.AM);
		}
		if (
			isTimeOverlapping({
				startA: start,
				endA: end,
				startB: owPmStart,
				endB: owPmEnd
			})
		) {
			owTimes.push(OWTime.PM);
		}
	} else if (rsv.category === ReservationCategory.openwater) {
		owTimes.push(rsv.owTime);
		if (rsv.owTime === OWTime.AM) {
			start = owAmStart;
			end = owAmEnd;
		} else if (rsv.owTime === OWTime.PM) {
			start = owPmStart;
			end = owPmEnd;
		} else {
			throw new Error('invalid OWTime: ' + rsv.owTime);
		}
	} else {
		throw new Error('invalid reservation category: ' + rsv.category);
	}

	type XataFilter = { [key: string]: string | string[] | XataFilter | XataFilter[] };

	const filters: XataFilter[] = [];

	if (owTimes.length > 0) {
		filters.push({
			category: ReservationCategory.openwater,
			owTime: { $any: owTimes }
		});
	}

	for (let cat of [ReservationCategory.pool, ReservationCategory.classroom]) {
		let slots = getTimeSlots({
			settings,
			date: rsv.date,
			category: cat,
			start,
			end
		});
		if (slots != null) {
			let timeFilt: XataFilter[] = [];
			if (slots.startVals.length > 0) {
				timeFilt.push({ startTime: { $any: slots.startVals } });
			}
			if (slots.endVals.length > 0) {
				timeFilt.push({ endTime: { $any: slots.endVals } });
			}
			if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
				timeFilt.push({
					$all: [{ startTime: { $any: slots.beforeStart } }, { endTime: { $any: slots.afterEnd } }]
				});
			}
			if (timeFilt.length > 0) {
				filters.push({
					category: cat,
					$any: timeFilt
				});
			}
		}
	}
	return filters;
}
