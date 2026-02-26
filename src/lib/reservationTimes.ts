import type { SettingsManager } from '$lib/settings';
import { ReservationCategory, type ReservationCategoryT } from '$types';
import * as dtu from './datetimeUtils';

export const minPoolStart = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getMinPoolStartTime(date));
export const maxPoolEnd = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getMaxPoolEndTime(date));
export const minClassroomStart = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getMinClassroomStartTime(date));
export const maxClassroomEnd = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getMaxClassroomEndTime(date));
export const resCutoff = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getReservationCutOffTime(date));

export const inc = (stns: SettingsManager, date: string): number =>
	dtu.timeStrToMin(stns.getReservationIncrement(date));

export const minuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export function validReservationDate(
	stns: SettingsManager,
	date: Date,
	category: ReservationCategory
) {
	return dtu.datetimeToLocalDateStr(date) >= minValidDateStr(stns, category);
}

export function beforeResCutoff(
	stns: SettingsManager,
	dateStr: string,
	startTime: string,
	category: ReservationCategoryT
): boolean {
	let now = dtu.PanglaoDate();
	let today = dtu.datetimeToLocalDateStr(now);
	let tomorrow = dtu.PanglaoDate();
	tomorrow.setDate(now.getDate() + 1);
	let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

	// For pool and classroom, allow booking if target time is in the future
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category as ReservationCategory)) {
		if (dateStr > today) {
			return true;
		} else if (dateStr === today) {
			const timeUntilStart = dtu.timeStrToMin(startTime) - minuteOfDay(now);
			return timeUntilStart > 0; // Allow if target time is in the future
		}
		return false;
	} else if (dateStr > tomStr) {
		return true;
	} else if (dateStr == tomStr && minuteOfDay(now) <= resCutoff(stns, dateStr)) {
		return true;
	} else {
		return false;
	}
}

export function beforeCancelCutoff(
	stns: SettingsManager,
	dateStr: string,
	startTime: string,
	category: ReservationCategoryT
): boolean {
	const now = dtu.PanglaoDayJs();
	const startDt = dtu.fromPanglaoDateTimeStringToDayJs(dateStr, startTime);
	const diffInMin = startDt.diff(now, 'minutes');
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category as ReservationCategory)) {
		return diffInMin > 60; // Keep 1 hour cutoff for modifications
	} else {
		return diffInMin > dtu.timeStrToMin(stns.getCancelationCutOffTime(dateStr));
	}
}

const minStart = (stns: SettingsManager, dateStr: string, cat: ReservationCategoryT) =>
	cat === ReservationCategory.pool ? minPoolStart(stns, dateStr) : minClassroomStart(stns, dateStr);
const maxEnd = (stns: SettingsManager, dateStr: string, cat: ReservationCategoryT) =>
	cat === ReservationCategory.pool ? maxPoolEnd(stns, dateStr) : maxClassroomEnd(stns, dateStr);

const nRes = (stns: SettingsManager, dateStr: string, cat: ReservationCategoryT) =>
	Math.floor((maxEnd(stns, dateStr, cat) - minStart(stns, dateStr, cat)) / inc(stns, dateStr));

/**
 * @returns array of 'HH:MM:SS'
 */
export const getStartEndTimesHHMMSS = (
	stns: SettingsManager,
	dateStr: string,
	cat: ReservationCategoryT
) =>
	Array(nRes(stns, dateStr, cat) + 1)
		.fill(undefined)
		.map((v, i) => dtu.minToHHMM(minStart(stns, dateStr, cat) + i * inc(stns, dateStr)));

/**
 * @returns array of 'HH:MM'
 */
export const getStartEndTimesHHMM = (
	stns: SettingsManager,
	dateStr: string,
	cat: ReservationCategoryT
) =>
	getStartEndTimesHHMMSS(stns, dateStr, cat).map(t => t.substring(0, 5));


/**
 * @returns array of 'HH:MM'
 */
export const startTimesHHMM = (stns: SettingsManager, dateStr: string, cat: ReservationCategoryT) =>
	getStartEndTimesHHMM(stns, dateStr, cat).slice(0, -1);

/**
 * @returns array of 'HH:MM'
 */
export const endTimesHHMM = (stns: SettingsManager, dateStr: string, cat: ReservationCategoryT) =>
	getStartEndTimesHHMM(stns, dateStr, cat).slice(1);

export function minValidDate(stns: SettingsManager, category: ReservationCategoryT) {
	let today = dtu.PanglaoDate();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let d = dtu.PanglaoDate();
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category as ReservationCategory)) {
		let sTs = startTimesHHMM(stns, todayStr, category);
		let lastSlot = dtu.timeStrToMin(sTs[sTs.length - 1]);
		if (minuteOfDay(today) < lastSlot) {
			d.setDate(today.getDate());
		} else {
			d.setDate(today.getDate() + 1);
		}
	} else if (minuteOfDay(today) < resCutoff(stns, todayStr)) {
		d.setDate(today.getDate() + 1);
	} else {
		d.setDate(today.getDate() + 2);
	}
	return d;
}

export function minValidDateStr(stns: SettingsManager, category: ReservationCategoryT) {
	let d = minValidDate(stns, category);
	return dtu.datetimeToLocalDateStr(d);
}

export function maxValidDate(stns: SettingsManager) {
	let today = dtu.PanglaoDate();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let maxDay = dtu.PanglaoDate();
	maxDay.setDate(today.getDate() + stns.getReservationLeadTimeDays(todayStr));
	return maxDay;
}

export function maxValidDateStr(stns: SettingsManager) {
	return dtu.datetimeToLocalDateStr(maxValidDate(stns));
}
