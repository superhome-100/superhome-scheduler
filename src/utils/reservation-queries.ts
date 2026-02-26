import { OWTime, ReservationCategory, type Reservation } from '$types';
import { getStartEndTimes } from '$lib/reservationTimes';
import { minToTimeStr, timeStrToMin } from '$lib/datetimeUtils';
import type { SettingsManager } from '$lib/settings';

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
	const startF = minToTimeStr(timeStrToMin(start));
	const endF = minToTimeStr(timeStrToMin(end));
	let times = getStartEndTimes(settings, date, category);
	let sIdx = times.indexOf(startF);
	let eIdx = times.indexOf(endF);

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

// return filters for querying all reservations that overlap in time with the given reservation
// note: this searches across all categories
export function getTimeOverlapSupabaseFilter(settings: SettingsManager, rsv: Reservation): string {
	let owAmStart = settings.getOpenwaterAmStartTime(rsv.date);
	let owAmEnd = settings.getOpenwaterAmEndTime(rsv.date);
	let owPmStart = settings.getOpenwaterPmStartTime(rsv.date);
	let owPmEnd = settings.getOpenwaterPmEndTime(rsv.date);

	let start: string;
	let end: string;
	let owTimes: OWTime[] = [];

	if (
		[ReservationCategory.pool, ReservationCategory.classroom].includes(
			rsv.category as ReservationCategory
		)
	) {
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
		if (rsv.owTime === null) throw Error(`openwater has no owTime ${rsv}`);
		owTimes.push(rsv.owTime as OWTime);
		if (rsv.owTime === OWTime.AM) {
			start = owAmStart;
			end = owAmEnd;
		} else if (rsv.owTime === OWTime.PM) {
			start = owPmStart;
			end = owPmEnd;
		} else {
			throw new Error('invalid OWTime');
		}
	} else {
		throw new Error('invalid reservation category');
	}

	const orFilters: string[] = [];

	/* ---- Open water overlap ---- */
	if (owTimes.length > 0) {
		orFilters.push(
			`and(category.eq.${ReservationCategory.openwater},owTime.in.(${owTimes.join(',')}))`
		);
	}

	/* ---- Pool / classroom overlap ---- */
	for (let cat of [ReservationCategory.pool, ReservationCategory.classroom]) {
		const slots = getTimeSlots({
			settings,
			date: rsv.date,
			category: cat,
			start,
			end
		});

		if (!slots) continue;

		const timeClauses: string[] = [];

		if (slots.startVals.length > 0) {
			timeClauses.push(`startTime.in.(${slots.startVals.join(',')})`);
		}

		if (slots.endVals.length > 0) {
			timeClauses.push(`endTime.in.(${slots.endVals.join(',')})`);
		}

		if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
			timeClauses.push(
				`and(startTime.in.(${slots.beforeStart.join(',')}),endTime.in.(${slots.afterEnd.join(
					','
				)}))`
			);
		}

		if (timeClauses.length > 0) {
			orFilters.push(`and(category.eq.${cat},or(${timeClauses.join(',')}))`);
		}
	}

	return `or(${orFilters.join(',')})`;
}
