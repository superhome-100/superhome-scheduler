import type { SettingsStore } from '$lib/settings';

import * as dtu from './datetimeUtils';

export const minPoolStart = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getMinPoolStartTime(date));
export const maxPoolEnd = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getMaxPoolEndTime(date));
export const minClassroomStart = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getMinClassroomStartTime(date));
export const maxClassroomEnd = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getMaxClassroomEndTime(date));
export const resCutoff = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getReservationCutOffTime(date));
export const cancelCutoff = (stns: SettingsStore, cat: string, date: string): number => {
	if (['classroom', 'pool'].includes(cat)) {
		return 0;
	} else {
		return dtu.timeStrToMin(stns.getCancelationCutOffTime(date));
	}
};
export const inc = (stns: SettingsStore, date: string): number =>
	dtu.timeStrToMin(stns.getReservationIncrement(date));

export const minuteOfDay = (date: Date): number => date.getHours() * 60 + date.getMinutes();

export function validReservationDate(stns: SettingsStore, date: Date, category: string) {
	return dtu.datetimeToLocalDateStr(date) >= minValidDateStr(stns, category);
}

export function beforeResCutoff(
	stns: SettingsStore,
	dateStr: string,
	startTime: string,
	category: string
): boolean {
	let now = dtu.PanglaoDate();
	let tomorrow = dtu.PanglaoDate();
	tomorrow.setDate(now.getDate() + 1);
	let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

	if (['classroom', 'pool'].includes(category)) {
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
	stns: SettingsStore,
	dateStr: string,
	startTime: string,
	category: string
): boolean {
	let now = dtu.PanglaoDate();
	let today = dtu.datetimeToLocalDateStr(now);
	if (dateStr > today) {
		return true;
	} else if (
		dateStr === today &&
		dtu.timeStrToMin(startTime) - minuteOfDay(now) > cancelCutoff(stns, category, dateStr)
	) {
		return true;
	} else {
		return false;
	}
}

const minStart = (stns: SettingsStore, dateStr: string, cat: string) =>
	cat === 'pool'
		? minPoolStart(stns, dateStr)
		: cat === 'classroom'
		? minClassroomStart(stns, dateStr)
		: undefined;
const maxEnd = (stns: SettingsStore, dateStr: string, cat: string) =>
	cat === 'pool'
		? maxPoolEnd(stns, dateStr)
		: cat === 'classroom'
		? maxClassroomEnd(stns, dateStr)
		: undefined;

const nRes = (stns: SettingsStore, dateStr: string, cat: string) =>
	Math.floor((maxEnd(stns, dateStr, cat) - minStart(stns, dateStr, cat)) / inc(stns, dateStr));

export const startTimes = (stns: SettingsStore, dateStr: string, cat: string) =>
	Array(nRes(stns, dateStr, cat))
		.fill()
		.map((v, i) => dtu.minToTimeStr(minStart(stns, dateStr, cat) + i * inc(stns, dateStr)));

export const endTimes = (stns: SettingsStore, dateStr: string, cat: string) =>
	Array(nRes(stns, dateStr, cat))
		.fill()
		.map((v, i) => dtu.minToTimeStr(minStart(stns, dateStr, cat) + (i + 1) * inc(stns, dateStr)));

export function minValidDate(stns: SettingsStore, category: string) {
	let today = dtu.PanglaoDate();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let d = dtu.PanglaoDate();
	if (['classroom', 'pool'].includes(category)) {
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

export function minValidDateStr(stns: SettingsStore, category: string) {
	let d = minValidDate(stns, category);
	return dtu.datetimeToLocalDateStr(d);
}

export function maxValidDate(stns: SettingsStore) {
	let today = dtu.PanglaoDate();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let maxDay = dtu.PanglaoDate();
	maxDay.setDate(today.getDate() + stns.getReservationLeadTimeDays(todayStr));
	return maxDay;
}

export function maxValidDateStr(stns: SettingsStore) {
	return dtu.datetimeToLocalDateStr(maxValidDate(stns));
}
