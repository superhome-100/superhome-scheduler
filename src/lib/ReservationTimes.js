import { Settings } from './settings.js';
import * as dtu from './datetimeUtils.js';

export let minStart = (date) => dtu.timeStrToMin(Settings('minStartTime', date));
export let maxEnd = (date) => dtu.timeStrToMin(Settings('maxEndTime', date));
export let resCutoff = (date) => dtu.timeStrToMin(Settings('reservationCutOffTime', date));
export let cancelCutoff = (date) => dtu.timeStrToMin(Settings('cancelationCutOffTime', date));
export let inc = (date) => dtu.timeStrToMin(Settings('reservationIncrement', date));

/*
if ((inc < 60 && 60 % inc !== 0) || (inc > 60 && inc % 60 !== 0)) {
    throw "reservation time increment must evenly divide, or be a multiple of, 60 minutes";
}
*/

export const minuteOfDay = (date) => date.getHours()*60 + date.getMinutes();

export function validReservationDate(date) {
    let today = new Date();
    return today.getFullYear() <= date.getFullYear()
        && today.getMonth() <= date.getMonth()
        && (today.getDate() < date.getDate()-1
            || (today.getDate() == date.getDate()-1
            && minuteOfDay(today) < resCutoff(dtu.datetimeToLocalDateStr(date))
            )
        );
}

export function beforeResCutoff(dateStr) {
    let now = new Date();
    let tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    let tomStr = dtu.datetimeToLocalDateStr(tomorrow);

    if (dateStr > tomStr) {
        return true;
    } else if (dateStr == tomStr && minuteOfDay(now) <= resCutoff(dateStr)) {
        return true;
    } else {
        return false;
    }
}

export function beforeCancelCutoff(dateStr, startTime) {
    let now = new Date();
    let today = dtu.datetimeToLocalDateStr(now);
    if (dateStr > today) {
        return true;
    } else if (
        dateStr === today
        && (dtu.timeStrToMin(startTime) - minuteOfDay(now)) > cancelCutoff(dateStr)
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

export function minValidDate() {
    let today = new Date();
    let todayStr = dtu.datetimeToLocalDateStr(today);
    let d = new Date();
    if (minuteOfDay(today) < resCutoff(todayStr)) {
        d.setDate(today.getDate()+1);
    } else {
        d.setDate(today.getDate()+2);
    }
    return d;
}

export function minValidDateStr() {
    let d = minValidDate();
    return `${d.getFullYear()}-`
        + `${d.getMonth()+1}-`.padStart(3,'0')
        + `${d.getDate()}`.padStart(2,'0');
}


