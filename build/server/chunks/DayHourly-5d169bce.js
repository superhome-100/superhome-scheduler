import { c as create_ssr_component, b as subscribe, j as getContext, h as each, e as escape, v as validate_component } from './index3-9a6d7026.js';
import { s as startTimes, e as endTimes } from './reservations-a581989b.js';
import { b as users, v as viewMode, f as getReservationsByDate } from './stores2-2fbb3163.js';
import { d as datetimeToLocalDateStr, t as timeStrToMin } from './datetimeUtils-b60811f0.js';
import 'svelte-gestures';
import { S as Settings, a as ReservationCategory } from './settings-a7eb4ae9.js';
import { g as getDaySchedule, b as badgeColor } from './ReservationDialog-6b6eda34.js';
import './firebase-abda0d73.js';
import 'firebase/firestore';
import 'dayjs';
import './ExclamationCircle-dc9ffda9.js';
import { L as LoadingBar } from './LoadingBar-2b85ed2c.js';

const rowHeight = 3;
const blkMgn = 0.25;
const DayHourly = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let assignment;
  let slotDiv;
  let innerWidth;
  let slotWidthPx;
  let $users, $$unsubscribe_users;
  let $$unsubscribe_viewMode;
  $$unsubscribe_users = subscribe(users, (value) => $users = value);
  $$unsubscribe_viewMode = subscribe(viewMode, (value) => value);
  let { resInfo } = $$props;
  let { category } = $$props;
  let { date } = $$props;
  let { refreshTs = Date.now() } = $$props;
  let reservations = [];
  let isLoading = false;
  getContext("simple-modal");
  const slotsPerHr = (date2, category2) => {
    let st = startTimes(Settings, date2, category2);
    let et = endTimes(Settings, date2, category2);
    let beg = st[0];
    let end = et[et.length - 1];
    let totalMin = timeStrToMin(end) - timeStrToMin(beg);
    let sph = 60 / (totalMin / st.length);
    return sph;
  };
  const displayTimes = (date2, category2) => {
    let dateStr = datetimeToLocalDateStr(date2);
    let st = startTimes(Settings, dateStr, category2);
    let et = endTimes(Settings, dateStr, category2);
    let hrs = [];
    for (let i = 0; i < st.length; i++) {
      if (i % slotDiv == 0) {
        hrs.push(st[i]);
      }
    }
    hrs.push(et[et.length - 1]);
    return hrs;
  };
  const formatTag = (rsvs, nSlots, width, slotWidthPx2) => {
    let tag = "";
    if (rsvs[0].resType === "course") {
      let nickname = $users[rsvs[0].user.id].nickname;
      tag = nickname + " +" + rsvs[0].numStudents;
    } else {
      for (let i = 0; i < rsvs.length; i++) {
        let nickname = $users[rsvs[i].user.id].nickname;
        tag += nickname;
        if (i < rsvs.length - 1) {
          tag += " and ";
        }
      }
    }
    let lines = [];
    let start = 0;
    for (let i = 0; i < nSlots; i++) {
      let pxPerChar = (i == 0 ? 12 : 11) - 2 * width;
      let maxChar = Math.floor(width * slotWidthPx2 / pxPerChar);
      if (start < tag.length) {
        let nChar = Math.min(tag.length - start, maxChar);
        lines.push(tag.substr(start, nChar));
        start += nChar;
      }
    }
    return lines;
  };
  const spaceStyling = (styleType) => {
    if (styleType == "single") {
      return "mx-0.5 rounded-lg";
    } else if (styleType == "start") {
      return "ms-0.5 rounded-s-xl";
    } else if (styleType == "end") {
      return "me-0.5 rounded-e-xl";
    } else {
      return "rounded-none";
    }
  };
  const loadReservations = async () => {
    isLoading = true;
    const res = await getReservationsByDate(date, category === "pool" ? ReservationCategory.pool : ReservationCategory.classroom);
    if (res.status === "success") {
      reservations = res.reservations || [];
    }
    isLoading = false;
  };
  if ($$props.resInfo === void 0 && $$bindings.resInfo && resInfo !== void 0)
    $$bindings.resInfo(resInfo);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.refreshTs === void 0 && $$bindings.refreshTs && refreshTs !== void 0)
    $$bindings.refreshTs(refreshTs);
  assignment = getDaySchedule(reservations, date, category);
  slotDiv = slotsPerHr(datetimeToLocalDateStr(date), category);
  innerWidth = 0;
  slotWidthPx = parseInt(innerWidth * 88 / resInfo.resources.length / 100);
  {
    {
      (date || refreshTs) && loadReservations();
    }
  }
  $$unsubscribe_users();
  $$unsubscribe_viewMode();
  return `
${isLoading ? `${validate_component(LoadingBar, "LoadingBar").$$render($$result, {}, {}, {})}` : ``}
${Settings.getOpenForBusiness(datetimeToLocalDateStr(date)) === false ? `<div class="font-semibold text-3xl text-center">Closed</div>` : `${assignment.status === "error" ? `<div class="font-semibold text-red-600 text-xl text-center">Error assigning reservations!</div>
		<div class="text-sm text-center mb-4">Please report this error to the admin</div>` : ``}
	<div class="row text-xs sm:text-base"><div class="column w-[12%] m-0 text-center"><div style="height: 1lh"></div>
			${each(displayTimes(date, category), (t) => {
    return `<div class="font-semibold" style="${"height: " + escape(rowHeight, true) + "rem"}">${escape(t)}</div>`;
  })}</div>
		${each(resInfo.resources, (resource, i) => {
    return `<div class="column text-center" style="${"width: " + escape(88 / resInfo.resources.length, true) + "%"}"><div class="font-semibold">${escape(resInfo.name)} ${escape(resource)}</div>
				${assignment.schedule[i] ? `<div style="height: 0.5rem"></div>
					${each(assignment.schedule[i], (blk) => {
      return `${blk.blkType === "rsv" ? `<div class="${"rsv " + escape(category, true) + " bg-fixed " + escape(spaceStyling(blk.styleType), true) + " mb-1 text-sm cursor-pointer hover:font-semibold"}" style="${"height: " + escape(rowHeight * (blk.nSlots / slotDiv) - blkMgn, true) + "rem"}"><div class="block indicator w-full">${["single", "end"].includes(blk.styleType) ? `<span class="${"rsv-indicator " + escape(badgeColor(blk.data), true)}"></span>` : ``}
									${["single", "start"].includes(blk.styleType) ? `${each(formatTag(blk.data, blk.nSlots, blk.width, slotWidthPx), (line) => {
        return `<div>${escape(line)}</div>`;
      })}` : ``}</div>
							</div>` : `<div style="${"height: " + escape(rowHeight * (blk.nSlots / slotDiv), true) + "rem"}"></div>`}`;
    })}` : ``}
			</div>`;
  })}</div>`}`;
});

export { DayHourly as D };
//# sourceMappingURL=DayHourly-5d169bce.js.map
