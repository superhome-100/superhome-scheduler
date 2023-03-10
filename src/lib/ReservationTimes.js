export let openingHour = 8;
export let closingHour = 20;
export let inc = 30;
export let reservationCutoffHour = 18;

if ((inc < 60 && 60 % inc !== 0) || (inc > 60 && inc % 60 !== 0)) {
    throw "reservation time increment must evenly divide, or be a multiple of, 60 minutes";
}


export function datetimeParseDate(datetime) {
    let rexp = /([0-9]+)-([0-9]+)-([0-9]+)T.*/;
    let m = rexp.exec(datetime.toISOString());
    return {
        year: parseInt(m[1]),
        month: parseInt(m[2])-1, /* use JS Date() indexing for month [0-11] */
        day: parseInt(m[3]),
    };
}

export function datetimeToDateStr(datetime) {
    let rexp = /(.*)T.*/
    let m = rexp.exec(datetime.toISOString());
    return m[1];
}

export function validReservationDate(date) {

    let today = new Date();
    return today.getFullYear() <= date.getFullYear()
        && today.getMonth() <= date.getMonth()
        && (today.getDate() < date.getDate()-1
            || (today.getDate() == date.getDate()-1
            && today.getHours() < reservationCutoffHour
            )
        );
}

export const month2idx = {
    'January':0,
    'February':1,
    'March':2,
    'April':3,
    'May':4,
    'June':5,
    'July':6,
    'August':7,
    'September':8,
    'October':9,
    'November':10,
    'December':11
};

export const idx2month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
];

let nResPerHour = Math.floor(60/inc)
let nRes = nResPerHour*(closingHour-openingHour);

const minToTimeStr = (min) => `${Math.floor(min/60)}:` + `${(min % 60)}`.padStart(2,'0');
const rexp = /([0-9]*[0-9]):([0-9][0-9])/

export function timeStrToMin(timeStr) {
    let m = rexp.exec(timeStr);
    let hour = parseInt(m[1]);
    let min = parseInt(m[2]);
    return 60*hour + min;
}

export const startTimes = Array(nRes)
    .fill()
    .map((v,i) => minToTimeStr(openingHour*60 + i*inc));

export const endTimes = Array(nRes)
    .fill()
    .map((v,i) => minToTimeStr(openingHour*60 + (i+1)*inc));

function minValidDate() {
    let today = new Date();
    let d = new Date();
    if (today.getHours() < reservationCutoffHour) {
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
        month: idx2month[d.getMonth()],
        day: d.getDate()
    };
}

export function minValidDateStr() {
    let d = minValidDate();
    return `${d.getFullYear()}-`
        + `${d.getMonth()+1}-`.padStart(3,'0')
        + `${d.getDate()}`.padStart(2,'0');
}

export function toDateStr(date) {
    return `${date.year}-`
        + `${month2idx[date.month]+1}-`.padStart(3,'0')
        + `${date.day}`.padStart(2,'0');
}

export function dateStrInNDays(nDays) {
    let d = minValidDate();
    d.setDate(d.getDate() + nDays);
    return toDateStr({year: d.getFullYear(), month: idx2month[d.getMonth()], day: d.getDate()});
}
