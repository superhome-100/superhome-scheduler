import * as dtu from './datetimeUtils';

export const minPoolStart = (stns, date) => dtu.timeStrToMin(stns.get('minPoolStartTime', date));
export const maxPoolEnd = (stns, date) => dtu.timeStrToMin(stns.get('maxPoolEndTime', date));
export const minClassroomStart = (stns, date) =>
	dtu.timeStrToMin(stns.get('minClassroomStartTime', date));
export const maxClassroomEnd = (stns, date) =>
	dtu.timeStrToMin(stns.get('maxClassroomEndTime', date));
export const resCutoff = (stns, date) => dtu.timeStrToMin(stns.get('reservationCutOffTime', date));
export const cancelCutoff = (stns, cat, date) => {
	if (cat === 'classroom') {
		return 0;
	} else {
		return dtu.timeStrToMin(stns.get('cancelationCutOffTime', date));
	}
};
export const inc = (stns, date) => dtu.timeStrToMin(stns.get('reservationIncrement', date));

export const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();

export function validReservationDate(stns, date, category) {
	return dtu.datetimeToLocalDateStr(date) >= minValidDateStr(stns, category);
}

export function beforeResCutoff(stns, dateStr, startTime, category) {
	let now = new Date();
	let tomorrow = new Date();
	tomorrow.setDate(now.getDate() + 1);
	let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

	if (category === 'classroom') {
		return beforeCancelCutoff(stns, dateStr, startTime, category);
	} else if (dateStr > tomStr) {
		return true;
	} else if (dateStr == tomStr && minuteOfDay(now) <= resCutoff(stns, dateStr)) {
		return true;
	} else {
		return false;
	}
}

export function beforeCancelCutoff(stns, dateStr, startTime, category) {
	let now = new Date();
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

const minStart = (stns, dateStr, cat) =>
	cat === 'pool'
		? minPoolStart(stns, dateStr)
		: cat === 'classroom'
		? minClassroomStart(stns, dateStr)
		: undefined;
const maxEnd = (stns, dateStr, cat) =>
	cat === 'pool'
		? maxPoolEnd(stns, dateStr)
		: cat === 'classroom'
		? maxClassroomEnd(stns, dateStr)
		: undefined;

const nRes = (stns, dateStr, cat) =>
	Math.floor((maxEnd(stns, dateStr, cat) - minStart(stns, dateStr, cat)) / inc(stns, dateStr));

export const startTimes = (stns, dateStr, cat) =>
	Array(nRes(stns, dateStr, cat))
		.fill()
		.map((v, i) => dtu.minToTimeStr(minStart(stns, dateStr, cat) + i * inc(stns, dateStr)));

export const endTimes = (stns, dateStr, cat) =>
	Array(nRes(stns, dateStr, cat))
		.fill()
		.map((v, i) => dtu.minToTimeStr(minStart(stns, dateStr, cat) + (i + 1) * inc(stns, dateStr)));

export function minValidDate(stns, category) {
	let today = new Date();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let d = new Date();
	if (category === 'classroom') {
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

export function minValidDateStr(stns, category) {
	let d = minValidDate(stns, category);
	return dtu.datetimeToLocalDateStr(d);
}

export function maxValidDate(stns) {
	let today = new Date();
	let todayStr = dtu.datetimeToLocalDateStr(today);
	let maxDay = new Date();
	maxDay.setDate(today.getDate() + stns.get('reservationLeadTimeDays', todayStr));
	return maxDay;
}

export function maxValidDateStr(stns) {
	return dtu.datetimeToLocalDateStr(maxValidDate(stns));
}
