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

export function dateStrParseDate(dateStr) {
    let rexp = /([0-9]+)-([0-9]+)-([0-9]+)/;
    let m = rexp.exec(dateStr);
    return {
        year: parseInt(m[1]),
        month: parseInt(m[2])-1, /* use JS Date() indexing for month [0-11] */
        day: parseInt(m[3]),
    };
}

export function datetimeToLocalDateStr(datetime) {
    let rexp = /([0-9]+)\/([0-9]+)\/([0-9]+).*/
    let m = rexp.exec(datetime.toLocaleDateString());
    return m[3] + "-" + m[1].padStart(2,'0') + "-" + m[2].padStart(2,'0');
}

export const minToTimeStr = (min) => `${Math.floor(min/60)}:` + `${(min % 60)}`.padStart(2,'0');

const timeStrRE = /([0-9]*[0-9]):([0-9][0-9])/

const parseHM = (timeStr) => {
    let m = timeStrRE.exec(timeStr);
    let hour = parseInt(m[1]);
    let min = parseInt(m[2]);
    return { hour, min }
};

export function timeStrToMin(timeStr) {
    let p = parseHM(timeStr);
    return 60*p.hour + p.min;
}

export function timeGE(timeA, timeB) {
    let pA = parseHM(timeA);
    let pB = parseHM(timeB);
    if (pA.hour == pB.hour) {
        return pA.min >= pB.min;
    } else {
        return pA.hour > pB.hour;
    }
}

export function timeLT(timeA, timeB) {
    return !timeGE(timeA, timeB);
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
