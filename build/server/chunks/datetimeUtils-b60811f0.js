import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);
const idx2month = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const firstOfMonthStr = (dateStr) => {
  let m = /([0-9]+-[0-9]+-)[0-9]+/.exec(dateStr);
  return m[1] + "01";
};
const PhilippinesTimezoneOffset = -480;
const PanglaoDate = () => new Date(dayjs().tz("Asia/Manila").$d);
function datetimeToLocalDateStr(datetime) {
  return dayjs(datetime).locale("en-US").format("YYYY-MM-DD");
}
function datetimeToDateStr(dt) {
  let year = dt.getFullYear();
  let month = dt.getMonth() + 1;
  let day = dt.getDate();
  return year + "-" + month.toString().padStart(2, "0") + "-" + day.toString().padStart(2, "0");
}
function datetimeInPanglaoFromServer() {
  let d = /* @__PURE__ */ new Date();
  return new Date(d.getTime() - PhilippinesTimezoneOffset * 6e4);
}
const minToTimeStr = (min) => `${Math.floor(min / 60)}:` + `${min % 60}`.padStart(2, "0");
const timeStrRE = /([0-9]*[0-9]):([0-9][0-9])/;
const parseHM = (timeStr) => {
  let m = timeStrRE.exec(timeStr);
  if (!m)
    throw new Error("Invalid time string");
  const hour = parseInt(m[1]);
  const min = parseInt(m[2]);
  return { hour, min };
};
function timeStrToMin(timeStr) {
  let p = parseHM(timeStr);
  return 60 * p.hour + p.min;
}
function isValidProSafetyCutoff(reservationDate) {
  const now = dayjs().tz("Asia/Manila");
  const cutoff = dayjs(reservationDate).tz("Asia/Manila").subtract(1, "day").set("hour", 16).set("minute", 0);
  return now.isBefore(cutoff);
}
const getYYYYMMDD = (date) => dayjs(date).format("YYYY-MM-DD");

export { PanglaoDate as P, datetimeInPanglaoFromServer as a, datetimeToDateStr as b, idx2month as c, datetimeToLocalDateStr as d, firstOfMonthStr as f, getYYYYMMDD as g, isValidProSafetyCutoff as i, minToTimeStr as m, timeStrToMin as t };
//# sourceMappingURL=datetimeUtils-b60811f0.js.map
