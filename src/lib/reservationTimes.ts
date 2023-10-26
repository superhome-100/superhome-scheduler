import type { SettingsManager } from '$lib/client/settings';
import { ReservationCategory } from '$types';
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
export const cancelCutoff = (
	stns: SettingsManager,
	cat: ReservationCategory,
	date: string
): number => {
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(cat)) {
		return 0;
	} else {
		return dtu.timeStrToMin(stns.getCancelationCutOffTime(date));
	}
};
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
	category: ReservationCategory
): boolean {
	let now = dtu.PanglaoDate();
	let tomorrow = dtu.PanglaoDate();
	tomorrow.setDate(now.getDate() + 1);
	let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category)) {
		return beforeCancelCutoff(stns, dateStr, startTime, category);
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
	category: ReservationCategory
): boolean {
	let now = dtu.PanglaoDate();
	let today = dtu.datetimeToLocalDateStr(now);
	if (dateStr > today) {
		return true;
	} else
		return (
			dateStr === today &&
			dtu.timeStrToMin(startTime) - minuteOfDay(now) > cancelCutoff(stns, category, dateStr)
		);
}

const minStart = (stns: SettingsManager, dateStr: string, cat: ReservationCategory) =>
	cat === ReservationCategory.pool ? minPoolStart(stns, dateStr) : minClassroomStart(stns, dateStr);
const maxEnd = (stns: SettingsManager, dateStr: string, cat: ReservationCategory) =>
	cat === ReservationCategory.pool ? maxPoolEnd(stns, dateStr) : maxClassroomEnd(stns, dateStr);

const nRes = (stns: SettingsManager, dateStr: string, cat: ReservationCategory) =>
	Math.floor((maxEnd(stns, dateStr, cat) - minStart(stns, dateStr, cat)) / inc(stns, dateStr));

export const getStartEndTimes = (
	stns: SettingsManager,
	dateStr: string,
	cat: ReservationCategory
) =>
	Array(nRes(stns, dateStr, cat) + 1)
		.fill(undefined)
		.map((v, i) => dtu.minToTimeStr(minStart(stns, dateStr, cat) + i * inc(stns, dateStr)));

export const startTimes = (stns: SettingsManager, dateStr: string, cat: ReservationCategory) =>
	getStartEndTimes(stns, dateStr, cat).slice(0, -1);

export const endTimes = (stns: SettingsManager, dateStr: string, cat: ReservationCategory) =>
	getStartEndTimes(stns, dateStr, cat).slice(1);

export function minValidDate(stns: SettingsManager, category: ReservationCategory) {
	let today = dtu.PanglaoDate();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let d = dtu.PanglaoDate();
	if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category)) {
		let sTs = startTimes(stns, todayStr, category);
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

export function minValidDateStr(stns: SettingsManager, category: ReservationCategory) {
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
