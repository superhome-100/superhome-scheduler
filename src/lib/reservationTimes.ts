import type { SettingsManager } from '$lib/settings';
import { ReservationCategory, type ReservationCategoryT } from '$types';
import type { Dayjs } from 'dayjs';
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
export const openwaterResCutoffDayjs = (stns: SettingsManager, date: string): Dayjs => {
	const hhmm = dtu.parseHM(stns.getReservationCutOffTime(date))
	return dtu.PanglaoDayJs(date).subtract(1, 'day').hour(hhmm.hour).minute(hhmm.min);
}

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
	const now = dtu.PanglaoDayJs();
	const dateJs = dtu.fromPanglaoDateTimeStringToDayJs(dateStr, startTime);

	// For pool and classroom, allow booking if target time is in the future
	if (
		[ReservationCategory.pool, ReservationCategory.classroom].includes(
			category as ReservationCategory
		)
	) {
		return now < dateJs;
	} else {
		const resCutoffDt = openwaterResCutoffDayjs(stns, dateStr);
		return now < resCutoffDt;
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
	if (
		[ReservationCategory.pool, ReservationCategory.classroom].includes(
			category as ReservationCategory
		)
	) {
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
) => getStartEndTimesHHMMSS(stns, dateStr, cat).map((t) => t.substring(0, 5));

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

export function minValidDateStr(stns: SettingsManager, category: ReservationCategoryT) {
	const now = dtu.PanglaoDayJs();
	const todayStr = dtu.getYYYYMMDD(now)
	if (
		[ReservationCategory.pool, ReservationCategory.classroom].includes(
			category as ReservationCategory
		)
	) {
		const sTs = startTimesHHMM(stns, todayStr, category);
		const lastSlotHHMM = sTs[sTs.length - 1];
		const lastSlotDj = dtu.fromPanglaoDateTimeStringToDayJs(todayStr, lastSlotHHMM)
		if (now < lastSlotDj) {
			return dtu.getYYYYMMDD(now);
		} else {
			return dtu.getYYYYMMDD(now.add(1, "day"));
		}
	} else {
		if (now < openwaterResCutoffDayjs(stns, todayStr)) {
			return dtu.getYYYYMMDD(now);
		} else {
			return dtu.getYYYYMMDD(now.add(1, "day"));
		}
	}
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
