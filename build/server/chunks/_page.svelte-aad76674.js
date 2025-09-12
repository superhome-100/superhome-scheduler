import { c as create_ssr_component, b as subscribe, e as escape, v as validate_component, j as getContext, h as each } from './index3-9a6d7026.js';
import { M as Modal } from './ExclamationCircle-dc9ffda9.js';
import { R as ReservationDialog } from './ReservationDialog-6b6eda34.js';
import { P as PanglaoDate, d as datetimeToLocalDateStr, t as timeStrToMin } from './datetimeUtils-b60811f0.js';
import { m as minValidDateStr, a as beforeCancelCutoff, d as minuteOfDay } from './reservations-a581989b.js';
import { u as user, i as incomingReservations } from './stores2-2fbb3163.js';
import './firebase-abda0d73.js';
import 'svelte-gestures';
import { a as ReservationCategory, b as ReservationStatus, S as Settings } from './settings-a7eb4ae9.js';
import 'firebase/firestore';
import dayjs from 'dayjs';
import { T as Tabs, a as TabList, b as Tab, c as TabPanel } from './Tab-7a953107.js';
import './index2-be97e17a.js';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import 'axios';
import 'firebase/app';
import 'firebase/auth';
import './settingsManager-25266b11.js';

const TrashIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { svgStyle = "" } = $$props;
  if ($$props.svgStyle === void 0 && $$bindings.svgStyle && svgStyle !== void 0)
    $$bindings.svgStyle(svgStyle);
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${"w-4 h-4 " + escape(svgStyle, true)}"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"></path></svg>`;
});
const CancelDialog = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { rsv } = $$props;
  getContext("simple-modal");
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  return `<button class="p-1 bg-white/50 rounded-[50%]">${validate_component(TrashIcon, "TrashIcon").$$render($$result, {}, {}, {})}</button>`;
});
const MyReservations = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let rsvGroups;
  let $incomingReservations, $$unsubscribe_incomingReservations;
  let $user, $$unsubscribe_user;
  $$unsubscribe_incomingReservations = subscribe(incomingReservations, (value) => $incomingReservations = value);
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  let { resPeriod = "upcoming" } = $$props;
  function getResPeriod(rsv) {
    let view;
    let today = PanglaoDate();
    let todayStr = datetimeToLocalDateStr(today);
    if (rsv.date && rsv.date > todayStr) {
      view = "upcoming";
    } else if (rsv.date && rsv.date < todayStr) {
      view = "past";
    } else {
      let rsvMin = 0;
      if (rsv.category === ReservationCategory.openwater) {
        if (rsv.owTime === "AM") {
          rsvMin = timeStrToMin(Settings.getOpenwaterAmEndTime(rsv.date));
        } else if (rsv.owTime === "PM") {
          rsvMin = timeStrToMin(Settings.getOpenwaterPmEndTime(rsv.date));
        }
      } else {
        rsvMin = timeStrToMin(rsv.endTime);
      }
      view = rsvMin && rsvMin >= minuteOfDay(today) ? "upcoming" : "past";
    }
    return view;
  }
  const bgColorByCategoryFrom = {
    [ReservationCategory.pool]: "from-pool-bg-from",
    [ReservationCategory.openwater]: "from-openwater-bg-from",
    [ReservationCategory.classroom]: "from-classroom-bg-from"
  };
  const bgColorByCategoryTo = {
    [ReservationCategory.pool]: "to-pool-bg-to",
    [ReservationCategory.openwater]: "to-openwater-bg-to",
    [ReservationCategory.classroom]: "to-classroom-bg-to"
  };
  const catDesc = (rsv) => {
    let desc = [rsv.category];
    if (rsv.resType === "course") {
      desc += " +" + rsv.numStudents;
    }
    return desc;
  };
  const timeDesc = (rsv) => {
    const fmt = (time) => {
      let rx = /([0-9]+):([0-9]+)/;
      let m = rx.exec(time);
      let hr = parseInt(m[1]);
      let ind = "a";
      if (hr >= 12) {
        ind = "p";
      }
      if (hr > 12) {
        hr -= 12;
      }
      if (m[2] == "00") {
        return hr + ind;
      } else {
        return hr + ":" + m[2] + ind;
      }
    };
    let desc;
    if (["pool", "classroom"].includes(rsv.category)) {
      desc = " " + fmt(rsv.startTime) + "-" + fmt(rsv.endTime);
    } else if (rsv.category === "openwater") {
      desc = rsv.owTime + " " + rsv.maxDepth + "m ";
    }
    return desc;
  };
  getContext("simple-modal");
  const sortChronologically = (rsvs, resPeriod2) => {
    let sign = resPeriod2 === "upcoming" ? 1 : -1;
    return rsvs.sort((a, b) => {
      if (a.date > b.date) {
        return sign;
      } else if (a.date === b.date && timeStrToMin(a.startTime) > timeStrToMin(b.startTime)) {
        return sign;
      } else {
        return -sign;
      }
    });
  };
  const groupRsvs = (resPeriod2, allRsvs, userPastRsvs) => {
    let rsvs = [];
    if (resPeriod2 === "upcoming") {
      rsvs = allRsvs.filter((rsv) => {
        return rsv?.user?.id === $user.id && getResPeriod(rsv) === resPeriod2;
      });
    } else if (resPeriod2 === "past") {
      rsvs = userPastRsvs.filter((rsv) => getResPeriod(rsv) === resPeriod2);
    }
    const sorted = sortChronologically(rsvs, resPeriod2);
    if (resPeriod2 === "upcoming") {
      return [{ rsvs: sorted }];
    } else {
      return sorted.reduce(
        (grps, rsv) => {
          const month = dayjs(rsv.date).format("MMMM-YYYY");
          const monthGroup = grps.find((g) => g.month === month);
          if (monthGroup) {
            monthGroup.rsvs.push(rsv);
          } else {
            grps.push({ month, rsvs: [rsv] });
          }
          return grps;
        },
        []
      );
    }
  };
  let pastReservations = [];
  const statusTextColor = {
    [ReservationStatus.confirmed]: "text-status-confirmed",
    [ReservationStatus.pending]: "text-status-pending",
    [ReservationStatus.rejected]: "text-status-rejected"
  };
  const totalThisMonth = (rsvs) => {
    return rsvs.reduce((t, rsv) => rsv.price ? t + rsv.price : t, 0);
  };
  if ($$props.resPeriod === void 0 && $$bindings.resPeriod && resPeriod !== void 0)
    $$bindings.resPeriod(resPeriod);
  rsvGroups = groupRsvs(resPeriod, $incomingReservations, pastReservations);
  $$unsubscribe_incomingReservations();
  $$unsubscribe_user();
  return `${$user ? `${`${rsvGroups.length === 0 ? `<div>No reservations found.</div>` : ``}`}
	<table class="m-auto border-separate border-spacing-y-1"><tbody>${each(rsvGroups, ({ month, rsvs }) => {
    return `${each(rsvs, (rsv) => {
      return `<tr class="${"[&>td]:w-24 h-10 bg-gradient-to-br " + escape(bgColorByCategoryFrom[rsv.category], true) + " " + escape(bgColorByCategoryTo[rsv.category], true) + " cursor-pointer"}"><td class="rounded-s-xl text-white text-sm font-semibold">${escape(dayjs(rsv.date).format("D MMM"))}</td>
						<td class="text-white text-sm font-semibold">${escape(catDesc(rsv))}</td>
						<td class="text-white text-sm font-semibold">${escape(timeDesc(rsv))}</td>
						<td class="text-white text-sm font-semibold"><div class="${"align-middle m-auto w-fit rounded-lg " + escape(statusTextColor[rsv.status], true)}">${escape(rsv.status)}
							</div></td>
						${beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category) ? `<td class="rounded-e-xl">${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(CancelDialog, "CancelDialog").$$render($$result, { rsv }, {}, {})}
								`;
        }
      })}
							</td>` : `<td class="text-white text-sm font-semibold rounded-e-xl">${rsv.price == null ? `TBD` : `₱${escape(rsv.price)}`}
							</td>`}
					</tr>`;
    })}
				${resPeriod === "past" ? `<tr class="[&>td]:w-24 h-10"><td></td><td></td><td></td>
						<td class="bg-rose-500 text-white text-sm font-semibold rounded-s-xl">${escape(month)} Total:
						</td>
						<td class="bg-rose-500 text-white text-sm font-semibold rounded-e-xl">₱${escape(totalThisMonth(rsvs))}</td>
					</tr>` : ``}`;
  })}</tbody></table>` : ``}`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $user, $$unsubscribe_user;
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  let modalOpened = false;
  $$unsubscribe_user();
  return `${$user != null ? `<span class="flex items-center justify-between mr-2"><span></span>
		<span class="text-lg font-semibold">${escape(($user?.name || "").split(" ")[0])}&#39;s Reservations</span>
		${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(ReservationDialog, "ReservationDialog").$$render(
        $$result,
        {
          dateFn: (cat) => minValidDateStr(Settings, cat)
        },
        {},
        {}
      )}`;
    }
  })}</span>
	${validate_component(Tabs, "Tabs").$$render($$result, { disableNav: modalOpened }, {}, {
    default: () => {
      return `${validate_component(TabList, "TabList").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(Tab, "Tab").$$render($$result, {}, {}, {
            default: () => {
              return `Upcoming`;
            }
          })}
			${validate_component(Tab, "Tab").$$render($$result, {}, {}, {
            default: () => {
              return `Completed`;
            }
          })}`;
        }
      })}

		${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(MyReservations, "MyReservations").$$render($$result, { resPeriod: "upcoming" }, {}, {})}`;
            }
          })}`;
        }
      })}
		${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
        default: () => {
          return `${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
            default: () => {
              return `${validate_component(MyReservations, "MyReservations").$$render($$result, { resPeriod: "past" }, {}, {})}`;
            }
          })}`;
        }
      })}`;
    }
  })}` : `<h1>loading data...</h1>`}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-aad76674.js.map
