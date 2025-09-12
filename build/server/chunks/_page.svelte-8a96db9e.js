import { c as create_ssr_component, b as subscribe, d as set_store_value, e as escape, h as each, v as validate_component, f as add_attribute } from './index3-9a6d7026.js';
import 'svelte-gestures';
import dayjs from 'dayjs';
import { L as LoadingBar, C as Chevron, g as getCategoryDatePath } from './LoadingBar-2b85ed2c.js';
import { R as ReservationDialog } from './ReservationDialog-6b6eda34.js';
import { M as Modal } from './ExclamationCircle-dc9ffda9.js';
import { m as minValidDateStr } from './reservations-a581989b.js';
import { c as idx2month, g as getYYYYMMDD } from './datetimeUtils-b60811f0.js';
import { c as view, a as stateLoaded, l as loginState, g as getReservationSummary } from './stores2-2fbb3163.js';
import { S as Settings } from './settings-a7eb4ae9.js';
import { a as auth } from './firebase-abda0d73.js';
import 'firebase/firestore';
import './index2-be97e17a.js';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import 'axios';
import './settingsManager-25266b11.js';
import 'firebase/app';
import 'firebase/auth';

const DayOfMonth = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { date } = $$props;
  let { category } = $$props;
  let { summary } = $$props;
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.summary === void 0 && $$bindings.summary && summary !== void 0)
    $$bindings.summary(summary);
  return `<div class="overflow-hidden h-full"><a class="no-underline"${add_attribute("href", getCategoryDatePath(category, date), 0)}><div class="h-full"><p class="${"flex justify-center w-6 m-auto " + escape(dayjs(date).isSame(dayjs(), "date") && "rounded-[50%] bg-stone-300 dark:bg-stone-600", true)}">${escape(dayjs(date).get("date"))}</p>
			${summary ? `${category === "openwater" && summary.openwater.total ? `<div class="${"mx-auto first-of-type:mt-2 first-of-type:mb-1 flex items-center justify-center text-sm rounded-xl h-6 w-10 md:w-16 px-1 rsv " + escape(category, true)}"><span class="hidden md:inline">AM</span>
						+${escape(summary.openwater.AM)}</div>
					<div class="${"mx-auto first-of-type:mt-2 first-of-type:mb-1 flex items-center justify-center text-sm rounded-xl h-6 w-10 md:w-16 px-1 rsv " + escape(category, true)}"><span class="hidden md:inline">PM</span>
						+${escape(summary.openwater.PM)}</div>` : ``}

				${category === "pool" && summary.pool ? `<div class="${"mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv " + escape(category, true)}">+${escape(summary.pool)}</div>` : ``}

				${category === "classroom" && summary.classroom ? `<div class="${"mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv " + escape(category, true)}">+${escape(summary.classroom)}</div>` : ``}` : ``}</div></a></div>`;
});
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let monthDates;
  let $view, $$unsubscribe_view;
  let $stateLoaded, $$unsubscribe_stateLoaded;
  let $loginState, $$unsubscribe_loginState;
  $$unsubscribe_view = subscribe(view, (value) => $view = value);
  $$unsubscribe_stateLoaded = subscribe(stateLoaded, (value) => $stateLoaded = value);
  $$unsubscribe_loginState = subscribe(loginState, (value) => $loginState = value);
  let { data } = $$props;
  set_store_value(view, $view = "multi-day", $view);
  let now = dayjs();
  let isLoading = false;
  function getWeeksInMonth(year = now.year(), month = now.month()) {
    const startOfMonth = dayjs().year(year).month(month).startOf("month");
    const endOfMonth = startOfMonth.endOf("month");
    let date = startOfMonth.startOf("week");
    const weeks = [];
    while (date <= endOfMonth) {
      const days = Array(7).fill(0).map((_, i) => date.add(i, "day"));
      weeks.push(days);
      date = date.add(1, "week");
    }
    return weeks;
  }
  let datesSummary = {};
  const loadSummary = async () => {
    if (monthDates.length) {
      isLoading = true;
      const firstWeek = monthDates[0];
      const lastWeek = monthDates[monthDates.length - 1];
      const data2 = await getReservationSummary(firstWeek[0].toDate(), lastWeek[lastWeek.length - 1].toDate());
      if (data2 && data2.status === "success") {
        datesSummary = { ...datesSummary, ...data2.summary };
      }
      isLoading = false;
    }
  };
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  monthDates = getWeeksInMonth(now.get("year"), now.get("month"));
  {
    {
      auth.authStateReady().then(() => {
        monthDates.length && loadSummary();
      });
    }
  }
  $$unsubscribe_view();
  $$unsubscribe_stateLoaded();
  $$unsubscribe_loginState();
  return `

${isLoading ? `${validate_component(LoadingBar, "LoadingBar").$$render($$result, {}, {}, {})}` : ``}
${$stateLoaded && $loginState === "in" ? `<div class="[&>*]:mx-auto flex items-center justify-between"><div class="dropdown h-8 mb-4"><label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown">${escape(data.category)}</label>
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">${each(["pool", "openwater", "classroom"], (cat) => {
    return `${cat !== data.category ? `<li><a class="text-xl active:bg-gray-300" href="${"/multi-day/" + escape(cat, true)}">${escape(cat)}</a>
						</li>` : ``}`;
  })}</ul></div>
		<div class="inline-flex items-center justify-between"><span class="cursor-pointer">${validate_component(Chevron, "Chevron").$$render($$result, { direction: "left", svgClass: "h-6 w-6" }, {}, {})}</span>
			<span class="cursor-pointer">${validate_component(Chevron, "Chevron").$$render($$result, { direction: "right", svgClass: "h-6 w-6" }, {}, {})}</span>
			<span class="text-2xl">${escape(idx2month[now.get("month")])}</span></div>
		<span class="">${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(ReservationDialog, "ReservationDialog").$$render(
        $$result,
        {
          category: data.category,
          dateFn: (cat) => minValidDateStr(Settings, cat)
        },
        {},
        {}
      )}`;
    }
  })}</span></div>
	<div><table class="calendar table-fixed border-collapse w-full"><thead><tr><th>S</th>
					<th>M</th>
					<th>T</th>
					<th>W</th>
					<th>T</th>
					<th>F</th>
					<th>S</th></tr></thead>
			<tbody>${each(monthDates, (week) => {
    return `<tr>${each(week, (date) => {
      return `<td${add_attribute("class", `border-${data.category}-bg-to align-top h-20 xs:h-24 border border-solid ${!date.isSame(now, "month") && "opacity-20 border-opacity-20"}`, 0)}>${validate_component(DayOfMonth, "DayOfMonth").$$render(
        $$result,
        {
          date: date.toDate(),
          category: data.category,
          summary: datesSummary[getYYYYMMDD(date)]
        },
        {},
        {}
      )}
							</td>`;
    })}
					</tr><tr></tr>`;
  })}</tbody></table></div>` : ``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-8a96db9e.js.map
