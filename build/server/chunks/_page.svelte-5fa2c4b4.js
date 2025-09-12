import { c as create_ssr_component, b as subscribe, d as set_store_value, o as onDestroy, h as each, v as validate_component, e as escape, f as add_attribute, j as getContext, w as createEventDispatcher } from './index3-9a6d7026.js';
import { p as page } from './stores-19d63d23.js';
import 'svelte-gestures';
import { c as view, a as stateLoaded, l as loginState, v as viewMode, e as buoys, h as adminComments, r as reservations, o as owUpdateStates, u as user, j as getOWAdminComments, f as getReservationsByDate, k as syncBuoys, b as users, m as getBoatAssignmentsByDate } from './stores2-2fbb3163.js';
import './datetimeUtils-b60811f0.js';
import { S as Settings, a as ReservationCategory } from './settings-a7eb4ae9.js';
import { M as Modal } from './ExclamationCircle-dc9ffda9.js';
import { T as Tabs, a as TabList, b as Tab, c as TabPanel } from './Tab-7a953107.js';
import { l as listenToDateSetting, a as listenOnDateUpdate, R as ReservationDialog, c as buoyDesc, d as displayTag, b as badgeColor, e as ResFormPool, f as ResFormOpenWater, h as ResFormClassroom, i as adminView } from './ReservationDialog-6b6eda34.js';
import './firebase-abda0d73.js';
import { b as beforeResCutoff, a as beforeCancelCutoff } from './reservations-a581989b.js';
import { g as getCategoryDatePath, C as Chevron, L as LoadingBar } from './LoadingBar-2b85ed2c.js';
import _ from 'lodash';
import { s as setBuoyToReservations } from './assignRsvsToBuoys-33e33a44.js';
import dayjs from 'dayjs';
import { C as CATEGORIES } from './constants-1a18d563.js';
import './index2-be97e17a.js';
import 'axios';
import 'dayjs/plugin/timezone.js';
import 'dayjs/plugin/utc.js';
import './settingsManager-25266b11.js';
import 'firebase/firestore';
import 'firebase/app';
import 'firebase/auth';

const ViewForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { hasForm = false } = $$props;
  let { rsv } = $$props;
  createEventDispatcher();
  getContext("simple-modal");
  if ($$props.hasForm === void 0 && $$bindings.hasForm && hasForm !== void 0)
    $$bindings.hasForm(hasForm);
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  return `${hasForm ? `<form method="POST" action="/?/adminUpdateConfirmed">${rsv.category === "pool" ? `${validate_component(ResFormPool, "ResFormPool").$$render($$result, { viewOnly: true, rsv }, {}, {})}` : `${rsv.category === "openwater" ? `${validate_component(ResFormOpenWater, "ResFormOpenWater").$$render($$result, { viewOnly: true, rsv }, {}, {})}` : `${rsv.category === "classroom" ? `${validate_component(ResFormClassroom, "ResFormClassroom").$$render($$result, { viewOnly: true, rsv }, {}, {})}` : ``}`}`}
		<input type="hidden" name="id"${add_attribute("value", rsv.id, 0)}>
		${adminView(true) ? `<div class="w-full flex px-8 gap-2 items-center justify-between"><button formaction="/?/adminUpdateRejected" class="bg-status-rejected px-3 py-1 w-1/3">Reject</button>
				<button formaction="/?/adminUpdatePending" class="bg-status-pending px-3 py-1 w-1/3">Pending</button>
				<button type="submit" class="bg-status-confirmed px-3 py-1 w-1/3">Confirm</button></div>` : ``}</form>` : ``}`;
});
const ModifyForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { hasForm = false } = $$props;
  let { rsv } = $$props;
  let error = "";
  getContext("simple-modal");
  let restrictModify = !beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category);
  if ($$props.hasForm === void 0 && $$bindings.hasForm && hasForm !== void 0)
    $$bindings.hasForm(hasForm);
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  return `${hasForm ? `<div><div class="form-title">modify reservation</div>
		<form method="POST" action="/?/modifyReservation"><input type="hidden" name="id"${add_attribute("value", rsv.id, 0)}>
			${rsv.category === "pool" ? `${validate_component(ResFormPool, "ResFormPool").$$render($$result, { restrictModify, rsv, error }, {}, {})}` : `${rsv.category === "openwater" ? `${validate_component(ResFormOpenWater, "ResFormOpenWater").$$render(
    $$result,
    {
      restrictModify,
      rsv,
      error,
      isModify: true
    },
    {},
    {}
  )}` : `${rsv.category === "classroom" ? `${validate_component(ResFormClassroom, "ResFormClassroom").$$render($$result, { rsv, error }, {}, {})}` : ``}`}`}</form></div>` : ``}`;
});
const RsvTabs = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $users, $$unsubscribe_users;
  let $user, $$unsubscribe_user;
  $$unsubscribe_users = subscribe(users, (value) => $users = value);
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  let { rsvs } = $$props;
  let { hasForm } = $$props;
  let { disableModify = false } = $$props;
  let { onSubmit = () => null } = $$props;
  getContext("simple-modal");
  let viewOnly = (rsv) => !beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category) || !beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category) && ["autonomous", "cbs"].includes(rsv.resType);
  let tabIndex = 0;
  if ($$props.rsvs === void 0 && $$bindings.rsvs && rsvs !== void 0)
    $$bindings.rsvs(rsvs);
  if ($$props.hasForm === void 0 && $$bindings.hasForm && hasForm !== void 0)
    $$bindings.hasForm(hasForm);
  if ($$props.disableModify === void 0 && $$bindings.disableModify && disableModify !== void 0)
    $$bindings.disableModify(disableModify);
  if ($$props.onSubmit === void 0 && $$bindings.onSubmit && onSubmit !== void 0)
    $$bindings.onSubmit(onSubmit);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<div class="mb-4">${validate_component(Tabs, "Tabs").$$render(
      $$result,
      { tabIndex },
      {
        tabIndex: ($$value) => {
          tabIndex = $$value;
          $$settled = false;
        }
      },
      {
        default: () => {
          return `${validate_component(TabList, "TabList").$$render($$result, {}, {}, {
            default: () => {
              return `${each(rsvs, (rsv) => {
                return `${validate_component(Tab, "Tab").$$render($$result, {}, {}, {
                  default: () => {
                    return `${escape($users[rsv.user.id].nickname)}`;
                  }
                })}`;
              })}`;
            }
          })}

		${each(rsvs, (rsv) => {
            return `${validate_component(TabPanel, "TabPanel").$$render($$result, {}, {}, {
              default: () => {
                return `${!disableModify && !viewOnly(rsv) && $user.id === rsv.user.id ? `${validate_component(ModifyForm, "ModifyForm").$$render($$result, { hasForm, rsv }, {}, {})}` : `${validate_component(ViewForm, "ViewForm").$$render(
                  $$result,
                  { hasForm, rsv },
                  {
                    rsv: ($$value) => {
                      rsv = $$value;
                      $$settled = false;
                    }
                  },
                  {}
                )}`}
			`;
              }
            })}`;
          })}`;
        }
      }
    )}</div>`;
  } while (!$$settled);
  $$unsubscribe_users();
  $$unsubscribe_user();
  return $$rendered;
});
const DayOpenWaterSubmissionsCard = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $user, $$unsubscribe_user;
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  let { submissions } = $$props;
  let { adminView: adminView2 = false } = $$props;
  let { onClick = () => {
  } } = $$props;
  let { adminComment = "" } = $$props;
  const curUserStyling = (rsv) => {
    if (rsv.user.id === $user?.id) {
      return "border border-transparent rounded bg-lime-300 text-black";
    } else {
      return "";
    }
  };
  if ($$props.submissions === void 0 && $$bindings.submissions && submissions !== void 0)
    $$bindings.submissions(submissions);
  if ($$props.adminView === void 0 && $$bindings.adminView && adminView2 !== void 0)
    $$bindings.adminView(adminView2);
  if ($$props.onClick === void 0 && $$bindings.onClick && onClick !== void 0)
    $$bindings.onClick(onClick);
  if ($$props.adminComment === void 0 && $$bindings.adminComment && adminComment !== void 0)
    $$bindings.adminComment(adminComment);
  $$unsubscribe_user();
  return `${submissions.length ? `
	<div class="text-center w-full"><div class="bg-gradient-to-br from-openwater-bg-from to-openwater-bg-to text-openwater-fg py-0.5 sm:py-2 pr-1 flex flex-col rounded-md cursor-pointer text-sm">${each(_.sortBy(submissions, "user.id"), (rsv, i) => {
    return `<div class="flex items-center w-full px-2"><div class="${"flex-1 text-xs lg:text-base " + escape(curUserStyling(rsv), true) + " overflow-auto break-all"}">${escape(displayTag(rsv, adminView2))}</div>
					<div class="pl-1 w-1"><span class="${"rsv-indicator " + escape(badgeColor([rsv]), true)}"></span></div>
				</div>`;
  })}

			${adminComment ? `<p class="flex flex-col text-sm p-0 text-gray-200">ADMIN: ${escape(adminComment)}</p>` : ``}</div></div>` : ``}`;
});
const DayOpenWaterV2 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let boats;
  let isAdmin;
  let $viewMode, $$unsubscribe_viewMode;
  let $buoys, $$unsubscribe_buoys;
  let $adminComments, $$unsubscribe_adminComments;
  let $reservationsStore, $$unsubscribe_reservationsStore;
  $$unsubscribe_viewMode = subscribe(viewMode, (value) => $viewMode = value);
  $$unsubscribe_buoys = subscribe(buoys, (value) => $buoys = value);
  $$unsubscribe_adminComments = subscribe(adminComments, (value) => $adminComments = value);
  $$unsubscribe_reservationsStore = subscribe(reservations, (value) => $reservationsStore = value);
  let { date = dayjs().format("YYYY-MM-DD") } = $$props;
  let { isAmFull = false } = $$props;
  let { refreshTs = Date.now() } = $$props;
  let { onUpdateReservations } = $$props;
  let isLoading = false;
  let adminCommentsLastUpdate = 0;
  let reservationsLastUpdate = 0;
  let reservations$1 = [];
  let boatAssignments = {};
  const { open } = getContext("simple-modal");
  const showViewRsvs = (rsvs) => {
    open(RsvTabs, {
      rsvs,
      hasForm: true,
      disableModify: $viewMode === "admin",
      onSubmit: () => {
        refreshAll();
      }
    });
  };
  const loadAdminComments = async () => {
    if (date) {
      set_store_value(adminComments, $adminComments[date] = await getOWAdminComments(date), $adminComments);
      set_store_value(adminComments, $adminComments = { ...$adminComments }, $adminComments);
    } else {
      set_store_value(adminComments, $adminComments[date] = [], $adminComments);
    }
  };
  const loadReservations = async () => {
    const data = await getReservationsByDate(date, ReservationCategory.openwater);
    if (data.reservations) {
      reservations$1 = data.reservations;
      set_store_value(reservations, $reservationsStore = reservations$1, $reservationsStore);
    }
    onUpdateReservations(reservations$1);
  };
  const loadBoatAssignments = async () => {
    const res = await getBoatAssignmentsByDate(date);
    if (res.status === "success") {
      boatAssignments = res.assignments || {};
    }
  };
  const refreshAll = async () => {
    adminCommentsLastUpdate = 0;
    reservationsLastUpdate = 0;
    reservationsLastUpdate = 0;
    isLoading = true;
    await Promise.all([loadAdminComments(), loadReservations(), loadBoatAssignments(), syncBuoys()]);
    initialize();
    isLoading = false;
  };
  const initialize = async () => {
    isLoading = true;
    if (reservations$1 && $buoys.length) {
      const amReservations = setBuoyToReservations($buoys, reservations$1.filter((r) => r.owTime === "AM"));
      const pmReservations = setBuoyToReservations($buoys, reservations$1.filter((r) => r.owTime === "PM"));
      const comments = $adminComments[date] || [];
      buoyGroupings = [...$buoys].map((v) => {
        const amComment = comments.find((c) => c.buoy === v.name && c.am_pm === "AM");
        const pmComment = comments.find((c) => c.buoy === v.name && c.am_pm === "PM");
        const buoyAmReservation = amReservations.filter((r) => r._buoy === v.name);
        const buoyPmReservation = pmReservations.filter((r) => r._buoy === v.name);
        return {
          id: `group_${v.name}`,
          buoy: v,
          boat: boatAssignments?.[v.name] || null,
          amReservations: buoyAmReservation,
          pmReservations: pmReservations.filter((r) => r._buoy === v.name),
          amAdminComment: amComment?.comment,
          pmAdminComment: pmComment?.comment,
          // only AM headcount is necessary
          amHeadCount: getHeadCount(buoyAmReservation),
          pmHeadCount: getHeadCount(buoyPmReservation)
        };
      }).sort((a, b) => +(a.boat || 0) - +(b.boat || 0)).filter((v) => v.amReservations.length > 0 || v.pmReservations.length > 0);
    }
    isLoading = false;
  };
  let buoyGroupings = [];
  const getHeadCount = (rsvs) => {
    return rsvs.reduce((acc, rsv) => acc + (rsv.resType === "course" ? rsv.numStudents + 1 : 1), 0);
  };
  owUpdateStates.subscribe(async (states) => {
    isLoading = true;
    const updates = [];
    if (states[date]?.adminComments !== adminCommentsLastUpdate) {
      adminCommentsLastUpdate = states[date]?.adminComments || 0;
      updates.push(loadAdminComments());
    }
    if (states[date]?.reservations !== reservationsLastUpdate) {
      reservationsLastUpdate = states[date]?.reservations || 0;
      updates.push(loadReservations());
    }
    await Promise.all(updates);
    initialize();
  });
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.isAmFull === void 0 && $$bindings.isAmFull && isAmFull !== void 0)
    $$bindings.isAmFull(isAmFull);
  if ($$props.refreshTs === void 0 && $$bindings.refreshTs && refreshTs !== void 0)
    $$bindings.refreshTs(refreshTs);
  if ($$props.onUpdateReservations === void 0 && $$bindings.onUpdateReservations && onUpdateReservations !== void 0)
    $$bindings.onUpdateReservations(onUpdateReservations);
  boats = Settings.getBoats(date);
  isAdmin = $viewMode === "admin";
  {
    {
      (date || refreshTs) && refreshAll();
    }
  }
  $$unsubscribe_viewMode();
  $$unsubscribe_buoys();
  $$unsubscribe_adminComments();
  $$unsubscribe_reservationsStore();
  return `${isLoading ? `${validate_component(LoadingBar, "LoadingBar").$$render($$result, {}, {}, {})}` : ``}
${isAmFull ? `<header class="bg-[#FF0000] text-white p-2 rounded-md">Morning session is full please book in the afternoon instead.
	</header>` : ``}
${Settings.getOpenForBusiness(date) === false ? `<div class="font-semibold text-3xl text-center">Closed</div>` : `<section class="w-full relative block"><header class="flex w-full gap-0.5 sm:gap-2 text-xs py-2"><div class="flex-none w-12 min-w-12">buoy</div>
			<div class="${[
    "flex-none text-center",
    (isAdmin ? "w-20" : "") + " " + (!isAdmin ? "w-8" : "")
  ].join(" ").trim()}">boat</div>
			<div class="grow text-center"><span>AM Count</span>

				${$viewMode === "admin" ? `<div class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1">${each(boats, (boat) => {
    return `<span class="font-bold ml-1">${escape(boat)}</span>
							<span class="bg-teal-100 border border-black px-0.5">${escape(buoyGroupings.filter((b) => b.boat === boat).reduce((a, b) => a + b.amHeadCount, 0))}</span>`;
  })}</div>` : ``}</div>
			<div class="grow text-center"><span>PM Count</span>

				${$viewMode === "admin" ? `<div class="sm:text-xl whitespace-nowrap w-fit opacity-70 z-10 bg-gray-100 dark:bg-gray-400 rounded-lg border border-black dark:text-black px-1">${each(boats, (boat) => {
    return `<span class="font-bold ml-1">${escape(boat)}</span>
							<span class="bg-teal-100 border border-black px-0.5">${escape(buoyGroupings.filter((b) => b.boat === boat).reduce((a, b) => a + b.pmHeadCount, 0))}</span>`;
  })}</div>` : ``}</div></header>
		<ul class="flex flex-col gap-0.5 sm:gap-3">${each(buoyGroupings, (grouping) => {
    return `<li class="flex items-center w-full gap-0.5 sm:gap-2 border-b-[1px] border-gray-200 border-opacity-20 pb-0.5 sm:pb-2"><div class="flex-none w-12 min-w-12">
						<div class="cursor-pointer font-semibold"><span>${escape(grouping.buoy.name)}</span>
							<br>
							<span class="text-xs">${escape(buoyDesc(grouping.buoy))}</span>
						</div></div>
					<div class="${[
      "flex-none px-2 text-center",
      (isAdmin ? "w-20" : "") + " " + (!isAdmin ? "w-8" : "")
    ].join(" ").trim()}">${$viewMode === "admin" ? `<select class="text-sm h-6 w-16 xs:text-xl xs:h-8 xs:w-16"${add_attribute("name", grouping.buoy.name + "_boat", 0)}${add_attribute("id", grouping.buoy.name + "_boat", 0)}><option value="null"></option>${each(boats, (boat) => {
      return `<option${add_attribute("value", boat, 0)}>${escape(boat)}</option>`;
    })}</select>` : `${escape(grouping.boat || "UNASSIGNED")}`}</div>
					<div class="grow flex w-auto relative gap-0.5 sm:gap-2"><div class="w-1/2">${validate_component(DayOpenWaterSubmissionsCard, "DayOpenWaterSubmissionsCard").$$render(
      $$result,
      {
        submissions: grouping.amReservations || [],
        onClick: () => {
          showViewRsvs(grouping.amReservations || []);
        },
        adminComment: grouping.amAdminComment,
        adminView: isAdmin
      },
      {},
      {}
    )}</div>
						<div class="w-1/2">${validate_component(DayOpenWaterSubmissionsCard, "DayOpenWaterSubmissionsCard").$$render(
      $$result,
      {
        submissions: grouping.pmReservations || [],
        onClick: () => {
          showViewRsvs(grouping.pmReservations || []);
        },
        adminComment: grouping.pmAdminComment,
        adminView: isAdmin
      },
      {},
      {}
    )}
						</div></div>
				</li>`;
  })}</ul></section>`}`;
});
const category = "openwater";
const Page = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let groupsHaveBeenAssignedBuoy;
  let groupsAreAutoAssigned;
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
  let reservations2 = [];
  const highlightButton = (active) => {
    if (active) {
      return "bg-openwater-bg-to text-white";
    } else {
      return "bg-root-bg-light dark:bg-root-bg-dark";
    }
  };
  set_store_value(view, $view = "single-day", $view);
  let isAmFull = false;
  let unsubscribe;
  let firestoreRefreshUnsub;
  function handleRouteChange() {
    if (unsubscribe)
      unsubscribe();
    if (firestoreRefreshUnsub)
      firestoreRefreshUnsub();
    unsubscribe = listenToDateSetting(new Date(data.day), (setting) => {
      isAmFull = !!setting.ow_am_full;
    });
    firestoreRefreshUnsub = listenOnDateUpdate(new Date(data.day), "openwater", () => {
      refreshTs = Date.now();
    });
  }
  onDestroy(() => {
    if (unsubscribe)
      unsubscribe();
    if (firestoreRefreshUnsub)
      firestoreRefreshUnsub();
  });
  if ($$props.data === void 0 && $$bindings.data && data !== void 0)
    $$bindings.data(data);
  groupsHaveBeenAssignedBuoy = reservations2.every((rsv) => rsv.buoy !== "auto");
  groupsAreAutoAssigned = reservations2.every((rsv) => rsv.buoy === "auto");
  {
    handleRouteChange();
  }
  $$unsubscribe_page();
  $$unsubscribe_view();
  $$unsubscribe_stateLoaded();
  $$unsubscribe_loginState();
  $$unsubscribe_viewMode();
  return `${$stateLoaded && $loginState === "in" ? `<div class="[&>*]:mx-auto flex items-center justify-between"><div class="dropdown h-8 mb-4"><label tabindex="0" class="border border-gray-200 dark:border-gray-700 btn btn-fsh-dropdown">Openwater</label>
			
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
	<div class="flex justify-between"><a class="inline-flex items-center border border-solid border-transparent hover:border-black rounded-lg pl-1.5 pr-4 py-0 hover:text-white hover:bg-gray-700" href="/multi-day/openwater"><span>${validate_component(Chevron, "Chevron").$$render($$result, { direction: "left" }, {}, {})}</span>
			<span class="xs:text-xl pb-1 whitespace-nowrap">month view</span></a>
		${$viewMode === "admin" ? `<div class="flex gap-2"><button class="${escape(highlightButton(groupsHaveBeenAssignedBuoy), true) + " px-1 py-0 font-semibold border-black dark:border-white"}">Lock
				</button>
				<button class="${escape(highlightButton(groupsAreAutoAssigned), true) + " px-1 py-0 font-semibold border-black dark:border-white"}">Unlock
				</button>
				<button class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white">mark morning as ${escape(isAmFull ? "not" : "")} full
				</button>
				<button class="bg-root-bg-light dark:bg-root-bg-dark px-1 py-0 font-semibold border-black dark:border-white">Approve All
				</button></div>` : ``}</div>
	<br>
	<div class="w-full min-h-[500px]">${validate_component(Modal, "Modal").$$render($$result, {}, {}, {
    default: () => {
      return `${validate_component(DayOpenWaterV2, "DayOpenWater").$$render(
        $$result,
        {
          date: data.day,
          isAmFull,
          refreshTs,
          onUpdateReservations: (rsvs) => {
            reservations2 = rsvs;
          }
        },
        {},
        {}
      )}`;
    }
  })}</div>` : ``}`;
});

export { Page as default };
//# sourceMappingURL=_page.svelte-5fa2c4b4.js.map
