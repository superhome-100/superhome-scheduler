import { c as create_ssr_component, b as subscribe, d as set_store_value, o as onDestroy, h as each, v as validate_component, e as escape, f as add_attribute } from './index3-9a6d7026.js';
import { p as page } from './stores-19d63d23.js';
import 'svelte-gestures';
import { S as Settings } from './settings-a7eb4ae9.js';
import { l as listenToDateSetting, a as listenOnDateUpdate, R as ReservationDialog } from './ReservationDialog-6b6eda34.js';
import { g as getCategoryDatePath, C as Chevron } from './LoadingBar-2b85ed2c.js';
import { M as Modal } from './ExclamationCircle-dc9ffda9.js';
import { c as view, a as stateLoaded, l as loginState, v as viewMode } from './stores2-2fbb3163.js';
import { C as CATEGORIES } from './constants-1a18d563.js';
import dayjs from 'dayjs';
import { D as DayHourly } from './DayHourly-5d169bce.js';
import './firebase-abda0d73.js';
import './datetimeUtils-b60811f0.js';
import './settingsManager-25266b11.js';
import './reservations-a581989b.js';
import 'firebase/firestore';
import './index2-be97e17a.js';
import 'axios';
import 'firebase/app';
import 'firebase/auth';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';

const category = "pool";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_page;
  let $view, $$unsubscribe_view;
  let $stateLoaded, $$unsubscribe_stateLoaded;
  let $loginState, $$unsubscribe_loginState;
  let $viewMode, $$unsubscribe_viewMode;
  $$unsubscribe_page = subscribe(page, (value) => value);
  $$unsubscribe_view = subscribe(view, (value) => $view = value);
  $$unsubscribe_stateLoaded = subscribe(stateLoaded, (value) => $stateLoaded = value);
  $$unsubscribe_loginState = subscribe(loginState, (value) => $loginState = value);
  $$unsubscribe_viewMode = subscribe(viewMode, (value) => $viewMode = value);
  let { data } = $$props;
  let categories = [...CATEGORIES];
  let refreshTs = Date.now();
  set_store_value(view, $view = "single-day", $view);
  let unsubscribe;
  let firestoreRefreshUnsub;
  function handleRouteChange() {
    if (unsubscribe)
      unsubscribe();
    if (firestoreRefreshUnsub)
      firestoreRefreshUnsub();
    unsubscribe = listenToDateSetting(new Date(data.day), (setting) => {
      !!setting.ow_am_full;
    });
    firestoreRefreshUnsub = listenOnDateUpdate(new Date(data.day), "pool", () => {
      refreshTs = Date.now();
    });
  }
  onDestroy(() => {
    if (unsubscribe)
      unsubscribe();
    if (firestoreRefreshUnsub)
      firestoreRefreshUnsub();
  });
  const resInfo = () => {
    const resources = Settings.getPoolLanes(data.day);
    const name = Settings.getPoolLabel(data.day);
    return { resources, name };
  };
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  {
    handleRouteChange();
  }
  $$unsubscribe_page();
  $$unsubscribe_view();
  $$unsubscribe_stateLoaded();
  $$unsubscribe_loginState();
  $$unsubscribe_viewMode();
  return `${$stateLoaded && $loginState === "in" ? `<div class="[&>*]:mx-auto flex items-center justify-between"><div class="dropdown h-8 mb-4"><label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown">Pool</label>
			
			<ul tabindex="0" class="dropdown-content menu p-0 shadow bg-base-100 rounded-box w-fit">${each(categories, (cat) => {
    return `${cat !== category ? `<li><a class="text-xl active:bg-gray-300"${add_attribute("href", getCategoryDatePath(cat, data.day), 0)}>${escape(cat)}</a>
						</li>` : ``}`;
  })}</ul></div>
		<div class="inline-flex items-center justify-between"><span class="cursor-pointer">${validate_component(Chevron, "Chevron").$$render($$result, { direction: "left", svgClass: "h-8 w-8" }, {}, {})}</span>
			<span class="cursor-pointer">${validate_component(Chevron, "Chevron").$$render($$result, { direction: "right", svgClass: "h-8 w-8" }, {}, {})}</span>
			<span class="text-2xl ml-2">${escape(dayjs(data.day).format("MMMM DD, YYYY dddd"))}</span></div>
		<span class="mr-2">${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(ReservationDialog, "ReservationDialog").$$render(
        $$result,
        {
          category,
          dateFn: () => data.day,
          onUpdate: () => {
            refreshTs = Date.now();
          }
        },
        {},
        {}
      )}`;
    }
  })}</span></div>
	<br>
	<div class="flex justify-between"><a class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700" href="/multi-day/pool"><span>${validate_component(Chevron, "Chevron").$$render($$result, { direction: "left" }, {}, {})}</span>
			<span class="xs:text-xl pb-1 whitespace-nowrap">month view</span></a>
		${$viewMode === "admin" ? `<button class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white">Approve All
			</button>` : ``}</div>
	<br>
	<div class="w-full min-h-[500px]">${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(DayHourly, "DayHourly").$$render(
        $$result,
        {
          category,
          refreshTs,
          resInfo: resInfo(),
          date: data.day
        },
        {},
        {}
      )}`;
    }
  })}</div>` : ``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-834ecb77.js.map
