import { Settings } from './settings.js';
import * as dtu from './datetimeUtils.js';

export let minStart = () => dtu.timeStrToMin(Settings('minStartTime'));
export let maxEnd = () => dtu.timeStrToMin(Settings('maxEndTime'));
export let resCutoff = () => dtu.timeStrToMin(Settings('reservationCutOffTime'));
export let inc = () => dtu.timeStrToMin(Settings('reservationIncrement'));

/*
if ((inc < 60 && 60 % inc !== 0) || (inc > 60 && inc % 60 !== 0)) {
    throw "reservation time increment must evenly divide, or be a multiple of, 60 minutes";
}
*/

const minuteOfDay = (date) => date.getHours()*60 + date.getMinutes();

export function validReservationDate(date) {
    let today = new Date();
    return today.getFullYear() <= date.getFullYear()
        && today.getMonth() <= date.getMonth()
        && (today.getDate() < date.getDate()-1
            || (today.getDate() == date.getDate()-1
            && minuteOfDay(today) < resCutoff()
            )
        );
}

let nRes = () => Math.floor((maxEnd() - minStart()) / inc())

export const startTimes = () => Array(nRes())
    .fill()
    .map((v,i) => dtu.minToTimeStr(minStart() + i*inc()));

export const endTimes = () => Array(nRes())
    .fill()
    .map((v,i) => dtu.minToTimeStr(minStart() + (i+1)*inc()));

export function minValidDate() {
    let today = new Date();
    let d = new Date();
    if (minuteOfDay(today) < resCutoff()) {
        d.setDate(today.getDate()+1);
    } else {
        d.setDate(today.getDate()+2);
    }
    return d;
}

export function minValidDateObj() {
    let d = minValidDate();
    return {
        year: d.getFullYear(),
        month: dtu.idx2month[d.getMonth()],
        day: d.getDate()
    };
}

export function minValidDateStr() {
    let d = minValidDate();
    return `${d.getFullYear()}-`
        + `${d.getMonth()+1}-`.padStart(3,'0')
        + `${d.getDate()}`.padStart(2,'0');
}


