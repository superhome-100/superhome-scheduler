import { Settings } from './settings.js';
import * as dtu from './datetimeUtils.js';

export let minStart = (date) => dtu.timeStrToMin(Settings('minStartTime', date));
export let maxEnd = (date) => dtu.timeStrToMin(Settings('maxEndTime', date));
export let resCutoff = (date) => dtu.timeStrToMin(Settings('reservationCutOffTime', date));
export let cancelCutoff = (cat, date) => {
    if (cat === 'classroom') {
        return 0;
    } else {
        return dtu.timeStrToMin(Settings('cancelationCutOffTime', date));
    }
};
export let inc = (date) => dtu.timeStrToMin(Settings('reservationIncrement', date));

/*
if ((inc < 60 && 60 % inc !== 0) || (inc > 60 && inc % 60 !== 0)) {
    throw "reservation time increment must evenly divide, or be a multiple of, 60 minutes";
}
*/

export const minuteOfDay = (date) => date.getHours()*60 + date.getMinutes();

export function validReservationDate(date, category) {
    return dtu.datetimeToLocalDateStr(date) >= minValidDateStr(category);
}

export function beforeResCutoff(dateStr, startTime, category) {
    let now = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

    if (category === 'classroom') {
        return beforeCancelCutoff(dateStr, startTime, category);
    } else if (dateStr > tomStr) {
        return true;
    } else if (dateStr == tomStr && minuteOfDay(now) <= resCutoff(dateStr)) {
        return true;
    } else {
        return false;
    }
}

export function beforeCancelCutoff(dateStr, startTime, category) {
    let now = new Date();
    let today = dtu.datetimeToLocalDateStr(now);
    if (dateStr > today) {
        return true;
    } else if (
        dateStr === today
        && (dtu.timeStrToMin(startTime) - minuteOfDay(now)) > cancelCutoff(category, dateStr)
    ) {
        return true;
    } else {
        return false;
    }
}

let nRes = (dateStr) => Math.floor((maxEnd(dateStr) - minStart(dateStr)) / inc(dateStr))

export const startTimes = (dateStr) => Array(nRes(dateStr))
    .fill()
    .map((v,i) => dtu.minToTimeStr(minStart(dateStr) + i*inc(dateStr)));

export const endTimes = (dateStr) => Array(nRes(dateStr))
    .fill()
    .map((v,i) => dtu.minToTimeStr(minStart(dateStr) + (i+1)*inc(dateStr)));

export function minValidDate(category) {
    let today = new Date();
    let todayStr = dtu.datetimeToLocalDateStr(today);
    let d = new Date();
    if (category === 'classroom') {
        let lastSlot = dtu.timeStrToMin(startTimes(todayStr)[startTimes(todayStr).length-1]);
        if (minuteOfDay(today) < lastSlot) {
            d.setDate(today.getDate())
        } else {
            d.setDate(today.getDate()+1)
        }
    }
    else if (minuteOfDay(today) < resCutoff(todayStr)) {
        d.setDate(today.getDate()+1);
    } else {
        d.setDate(today.getDate()+2);
    }
    return d;
}

export function minValidDateStr(category) {
    let d = minValidDate(category);
    return dtu.datetimeToLocalDateStr(d);
}


