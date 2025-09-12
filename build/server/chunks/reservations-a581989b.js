import { a as ReservationCategory } from './settings-a7eb4ae9.js';
import { P as PanglaoDate, d as datetimeToLocalDateStr, t as timeStrToMin, m as minToTimeStr } from './datetimeUtils-b60811f0.js';

const minPoolStart = (stns, date) => timeStrToMin(stns.getMinPoolStartTime(date));
const maxPoolEnd = (stns, date) => timeStrToMin(stns.getMaxPoolEndTime(date));
const minClassroomStart = (stns, date) => timeStrToMin(stns.getMinClassroomStartTime(date));
const maxClassroomEnd = (stns, date) => timeStrToMin(stns.getMaxClassroomEndTime(date));
const resCutoff = (stns, date) => timeStrToMin(stns.getReservationCutOffTime(date));
const cancelCutoff = (stns, cat, date) => {
  if ([ReservationCategory.pool, ReservationCategory.classroom].includes(cat)) {
    return 0;
  } else {
    return timeStrToMin(stns.getCancelationCutOffTime(date));
  }
};
const inc = (stns, date) => timeStrToMin(stns.getReservationIncrement(date));
const minuteOfDay = (date) => date.getHours() * 60 + date.getMinutes();
function beforeResCutoff(stns, dateStr, startTime, category) {
  let now = PanglaoDate();
  let today = datetimeToLocalDateStr(now);
  let tomorrow = PanglaoDate();
  tomorrow.setDate(now.getDate() + 1);
  let tomStr = datetimeToLocalDateStr(tomorrow);
  if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category)) {
    if (dateStr > today) {
      return true;
    } else if (dateStr === today) {
      const timeUntilStart = timeStrToMin(startTime) - minuteOfDay(now);
      return timeUntilStart > 0;
    }
    return false;
  } else if (dateStr > tomStr) {
    return true;
  } else if (dateStr == tomStr && minuteOfDay(now) <= resCutoff(stns, dateStr)) {
    return true;
  } else {
    return false;
  }
}
function beforeCancelCutoff(stns, dateStr, startTime, category) {
  let now = PanglaoDate();
  let today = datetimeToLocalDateStr(now);
  if (dateStr > today) {
    return true;
  } else {
    const timeUntilStart = timeStrToMin(startTime) - minuteOfDay(now);
    if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category)) {
      return dateStr === today && timeUntilStart > 60;
    } else {
      return dateStr === today && timeUntilStart > cancelCutoff(stns, category, dateStr);
    }
  }
}
const minStart = (stns, dateStr, cat) => cat === ReservationCategory.pool ? minPoolStart(stns, dateStr) : minClassroomStart(stns, dateStr);
const maxEnd = (stns, dateStr, cat) => cat === ReservationCategory.pool ? maxPoolEnd(stns, dateStr) : maxClassroomEnd(stns, dateStr);
const nRes = (stns, dateStr, cat) => Math.floor((maxEnd(stns, dateStr, cat) - minStart(stns, dateStr, cat)) / inc(stns, dateStr));
const getStartEndTimes = (stns, dateStr, cat) => Array(nRes(stns, dateStr, cat) + 1).fill(void 0).map((v, i) => minToTimeStr(minStart(stns, dateStr, cat) + i * inc(stns, dateStr)));
const startTimes = (stns, dateStr, cat) => getStartEndTimes(stns, dateStr, cat).slice(0, -1);
const endTimes = (stns, dateStr, cat) => getStartEndTimes(stns, dateStr, cat).slice(1);
function minValidDate(stns, category) {
  let today = PanglaoDate();
  let todayStr = datetimeToLocalDateStr(today);
  let d = PanglaoDate();
  if ([ReservationCategory.pool, ReservationCategory.classroom].includes(category)) {
    let sTs = startTimes(stns, todayStr, category);
    let lastSlot = timeStrToMin(sTs[sTs.length - 1]);
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
function minValidDateStr(stns, category) {
  let d = minValidDate(stns, category);
  return datetimeToLocalDateStr(d);
}
function maxValidDate(stns) {
  let today = PanglaoDate();
  let todayStr = datetimeToLocalDateStr(today);
  let maxDay = PanglaoDate();
  maxDay.setDate(today.getDate() + stns.getReservationLeadTimeDays(todayStr));
  return maxDay;
}
function maxValidDateStr(stns) {
  return datetimeToLocalDateStr(maxValidDate(stns));
}
const getNumberOfOccupants = (rsvs) => rsvs.reduce((n, rsv) => {
  if (rsv.category === "classroom") {
    return n + rsv.numStudents;
  } else {
    return rsv.resType === "course" ? n + 2 * Math.ceil(rsv.numStudents / 2) : n + 1;
  }
}, 0);

export { beforeCancelCutoff as a, beforeResCutoff as b, getNumberOfOccupants as c, minuteOfDay as d, endTimes as e, maxValidDateStr as f, getStartEndTimes as g, minValidDateStr as m, startTimes as s };
//# sourceMappingURL=reservations-a581989b.js.map
