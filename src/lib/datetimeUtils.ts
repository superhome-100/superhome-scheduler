import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);

export const month2idx: { [key: string]: number } = {
	January: 0,
	February: 1,
	March: 2,
	April: 3,
	May: 4,
	June: 5,
	July: 6,
	August: 7,
	September: 8,
	October: 9,
	November: 10,
	December: 11
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

export const firstOfMonthStr = (dateStr: string) => {
	let m = /([0-9]+-[0-9]+-)[0-9]+/.exec(dateStr);
	return m[1] + '01';
};

const PhilippinesTimezoneOffset = -480;

export const PanglaoDate = () => new Date(dayjs().tz('Asia/Manila').$d);

export function datetimeToLocalDateStr(datetime: Date) {
	let rexp = /([0-9]+)\/([0-9]+)\/([0-9]+).*/;
	let m = rexp.exec(datetime.toLocaleDateString('en-US'));
	if (!m) throw new Error('Invalid date string');

	return m[3] + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
}

export function datetimeToDateStr(dt: Date) {
	let year = dt.getFullYear();
	let month = dt.getMonth() + 1;
	let day = dt.getDate();
	return year + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0');
}

// the server's local time is always UTC regardless of its physical location
export function datetimeInPanglaoFromServer() {
	let d = new Date();
	return new Date(d.getTime() - PhilippinesTimezoneOffset * 60000);
}

export const minToTimeStr = (min: number) =>
	`${Math.floor(min / 60)}:` + `${min % 60}`.padStart(2, '0');

const timeStrRE = /([0-9]*[0-9]):([0-9][0-9])/;

const parseHM = (timeStr: string): { hour: number; min: number } => {
	let m = timeStrRE.exec(timeStr);
	if (!m) throw new Error('Invalid time string');
	const hour = parseInt(m[1]);
	const min = parseInt(m[2]);
	return { hour, min };
};

export function timeStrToMin(timeStr: string): number {
	let p = parseHM(timeStr);
	return 60 * p.hour + p.min;
}

export function timeGE(timeA: string, timeB: string) {
	let pA = parseHM(timeA);
	let pB = parseHM(timeB);
	if (pA.hour == pB.hour) {
		return pA.min >= pB.min;
	} else {
		return pA.hour > pB.hour;
	}
}

export function timeLT(timeA: string, timeB: string) {
	return !timeGE(timeA, timeB);
}

export function toDateStr(date: { year: number; month: string; day: number }) {
	return (
		`${date.year}-` +
		`${month2idx[date.month] + 1}-`.padStart(3, '0') +
		`${date.day}`.padStart(2, '0')
	);
}
