import { c as create_ssr_component, j as getContext, v as validate_component, g as get_store_value, b as subscribe, d as set_store_value, f as add_attribute, h as each, e as escape } from './index3-9a6d7026.js';
import { E as ExclamationCircle } from './ExclamationCircle-dc9ffda9.js';
import { a as ReservationCategory, S as Settings, R as ReservationType, b as ReservationStatus } from './settings-a7eb4ae9.js';
import { b as users, r as reservations, d as canSubmit, e as buoys, u as user, v as viewMode } from './stores2-2fbb3163.js';
import { g as getStartEndTimes, e as endTimes, c as getNumberOfOccupants, m as minValidDateStr, f as maxValidDateStr, s as startTimes, d as minuteOfDay } from './reservations-a581989b.js';
import { d as datetimeToLocalDateStr, P as PanglaoDate, t as timeStrToMin } from './datetimeUtils-b60811f0.js';
import { f as firestore } from './firebase-abda0d73.js';
import { doc, onSnapshot } from 'firebase/firestore';
import dayjs from 'dayjs';

const getWidth = (rsv) => rsv.category == ReservationCategory.pool ? getNumberOfOccupants([rsv]) + rsv.buddies.length : 1;
function rsvsToBlock({
  rsvs,
  startEndTimes,
  category,
  resourceNames
}) {
  const rsv = rsvs[0];
  const startTime = startEndTimes.indexOf(rsv.startTime);
  const endTime = startEndTimes.indexOf(rsv.endTime);
  const pathLen = endTime - startTime;
  const width = getWidth(rsv);
  const spacePath = Array(pathLen).fill(-1);
  if (category == ReservationCategory.pool) {
    if (rsv.lanes[0] != "auto") {
      const nSpaces = resourceNames.length;
      const lane = resourceNames.indexOf(rsv.lanes[0]);
      if (nSpaces - lane >= width) {
        spacePath.fill(lane);
      }
    }
  } else {
    if (rsv.room != "auto") {
      spacePath.fill(resourceNames.indexOf(rsv.room));
    }
  }
  return {
    rsvs,
    startTime,
    endTime,
    width,
    spacePath
  };
}
function createBuddyGroups(rsvs) {
  let remaining = [...rsvs];
  let grps = [];
  let isBuddy = (a, b) => {
    return a.buddies.includes(b.user.id) && a.startTime == b.startTime;
  };
  while (remaining.length > 0) {
    let next = remaining.splice(0, 1)[0];
    let bg = [next];
    for (let i = remaining.length - 1; i >= 0; i--) {
      if (isBuddy(next, remaining[i])) {
        bg.push(remaining.splice(i, 1)[0]);
      }
    }
    grps.push(bg);
  }
  return grps;
}
const getNextBlock = (blocks, space, time) => {
  let { idx } = blocks.reduce(
    ({ minStart, idx: idx2 }, blk, i) => {
      const tOffset = time - blk.startTime;
      const relativeBlkStart = tOffset < 0 ? blk.startTime : tOffset + blk.startTime;
      const startSpace = tOffset < 0 ? blk.spacePath[0] : blk.spacePath[tOffset];
      if (startSpace <= space && space < startSpace + blk.width && time <= relativeBlkStart && relativeBlkStart < minStart) {
        return { minStart: relativeBlkStart, idx: i };
      } else {
        return { minStart, idx: idx2 };
      }
    },
    { minStart: Infinity, idx: -1 }
  );
  return blocks[idx];
};
const getStyleType = (width, startSpace, space) => {
  if (width == 1) {
    return "single";
  } else {
    return space == startSpace ? "start" : space == startSpace + width - 1 ? "end" : "middle";
  }
};
function blocksToDisplayData(blocks, nSpaces, nTimeSlots) {
  let schedule = Array(nSpaces).fill(null).map(() => {
    return [];
  });
  const filler = (nSlots) => {
    return {
      nSlots,
      blkType: "filler",
      width: 0,
      data: [],
      styleType: "single"
    };
  };
  for (let space = 0; space < nSpaces; space++) {
    let time = 0;
    while (time < nTimeSlots) {
      let nextBlock = getNextBlock(blocks, space, time);
      if (nextBlock) {
        if (nextBlock.startTime > time) {
          schedule[space].push(filler(nextBlock.startTime - time));
          time = nextBlock.startTime;
        }
        const tOffset = time - nextBlock.startTime;
        const startSpace = nextBlock.spacePath[tOffset];
        const unbrokenLength = nextBlock.spacePath.slice(tOffset).reduce((n, s) => s == startSpace ? n + 1 : n, 0);
        schedule[space].push({
          nSlots: unbrokenLength,
          blkType: "rsv",
          width: nextBlock.width,
          data: nextBlock.rsvs,
          styleType: getStyleType(nextBlock.width, startSpace, space)
        });
        time += unbrokenLength;
      } else {
        schedule[space].push(filler(nTimeSlots - time));
        time = nTimeSlots;
      }
    }
  }
  return schedule;
}
function getMinBreaksPath(spacesByTimes, width, startTime, endTime) {
  let pathObj = getMinBreaksPathRec(spacesByTimes, width, startTime, endTime, {
    breaks: 0,
    path: []
  });
  return pathObj;
}
function getMinBreaksPathRec(sByT, nSpaces, curTime, endTime, pathObj) {
  if (curTime === endTime) {
    return pathObj;
  }
  const slotIsAvailable = (startSpace) => {
    return [...Array(nSpaces).keys()].reduce((b, offset) => {
      return b && sByT[startSpace + offset][curTime] == false;
    }, true);
  };
  let minBreaks = Infinity;
  let bestPath = null;
  const curSpace = pathObj.path.length == 0 ? null : pathObj.path[pathObj.path.length - 1];
  const totalSpaces = sByT.length;
  const validSteps = [];
  for (let space = 0; space <= totalSpaces - nSpaces; space += 1) {
    if (slotIsAvailable(space)) {
      const thisBreak = curSpace == null || space == curSpace ? 0 : 1;
      validSteps.push({ space, thisBreak });
    }
  }
  validSteps.sort((a, b) => a.thisBreak - b.thisBreak);
  for (let step of validSteps) {
    let thisPath = getMinBreaksPathRec(sByT, nSpaces, curTime + 1, endTime, {
      breaks: step.thisBreak,
      path: [step.space]
    });
    if (thisPath.path.length > 0) {
      if (thisPath.breaks == 0) {
        bestPath = thisPath;
        break;
      } else if (thisPath.breaks < minBreaks) {
        minBreaks = thisPath.breaks;
        bestPath = thisPath;
      }
    }
  }
  if (bestPath) {
    pathObj.breaks += bestPath.breaks;
    pathObj.path = pathObj.path.concat(bestPath.path);
  } else {
    pathObj.path = [];
  }
  return pathObj;
}
function insertPreAssigned(spacesByTimes, blk) {
  for (let t = blk.startTime; t < blk.endTime; t++) {
    let startSpace = blk.spacePath[t - blk.startTime];
    for (let s = 0; s < blk.width; s++) {
      spacesByTimes[startSpace + s][t] = true;
    }
  }
}
function insertUnAssigned(spacesByTimes, blk) {
  let bestPath = getMinBreaksPath(spacesByTimes, blk.width, blk.startTime, blk.endTime);
  if (bestPath.path.length > 0) {
    blk.spacePath = bestPath.path;
    for (let time = blk.startTime; time < blk.endTime; time++) {
      const space = bestPath.path[time - blk.startTime];
      for (let i = space; i < space + blk.width; i++) {
        spacesByTimes[i][time] = true;
      }
    }
    return bestPath.breaks;
  } else {
    return -1;
  }
}
function removeAssigned(spacesByTimes, blocks) {
  for (const blk of blocks) {
    if (blk.spacePath[0] >= 0) {
      for (let time = blk.startTime; time < blk.endTime; time++) {
        const space = blk.spacePath[time - blk.startTime];
        for (let i = space; i < space + blk.width; i++) {
          spacesByTimes[i][time] = false;
        }
      }
      blk.spacePath.fill(-1);
    }
  }
}
const tryInsertUnassigned = (spacesByTimes, unAsn) => {
  let failedIdx = -1;
  const brokenIds = [];
  let nBreaks = 0;
  for (let i = 0; i < unAsn.length; i++) {
    const thisBreaks = insertUnAssigned(spacesByTimes, unAsn[i]);
    if (thisBreaks == -1) {
      failedIdx = i;
      break;
    } else if (thisBreaks > 0) {
      nBreaks += thisBreaks;
      brokenIds.push(i);
    }
  }
  return { failedIdx, brokenIds, nBreaks };
};
const searchForBestOrdering = (MAX_TRIALS, spacesByTimes, blocks) => {
  let bestOrder = [...blocks];
  let minBreaks = Infinity;
  let nTrials = 0;
  while (nTrials < MAX_TRIALS) {
    nTrials++;
    const { failedIdx, brokenIds, nBreaks } = tryInsertUnassigned(spacesByTimes, blocks);
    if (failedIdx >= 0) {
      removeAssigned(spacesByTimes, blocks);
      const blk = blocks.splice(failedIdx, 1)[0];
      blocks = [blk, ...blocks];
    } else if (brokenIds.length > 0) {
      if (nBreaks < minBreaks) {
        minBreaks = nBreaks;
        bestOrder = [...blocks];
      }
      brokenIds.sort((a, b) => b - a);
      const brkn = brokenIds.reduce((brkn2, idx) => {
        brkn2.push(blocks.splice(idx, 1)[0]);
        return brkn2;
      }, []);
      blocks = [...brkn, ...blocks];
      removeAssigned(spacesByTimes, blocks);
    } else {
      bestOrder = [...blocks];
      removeAssigned(spacesByTimes, blocks);
      break;
    }
  }
  return { bestOrder, nTrials };
};
function breakUpNextGroup(blocks) {
  const nextGrpIdx = blocks.reduce(
    (idx, blk, blk_i) => idx == -1 && blk.width > 1 ? blk_i : idx,
    -1
  );
  const grp = blocks.splice(nextGrpIdx, 1)[0];
  let rsvs = [];
  if (grp.rsvs[0].resType == ReservationType.course) {
    const nSlots = getNumberOfOccupants(grp.rsvs);
    for (let i = 0; i < nSlots; i++) {
      rsvs.push({ ...grp.rsvs[0] });
    }
  } else {
    rsvs = grp.rsvs;
  }
  for (const rsv of rsvs) {
    blocks.push({
      rsvs: [rsv],
      startTime: grp.startTime,
      endTime: grp.endTime,
      width: 1,
      spacePath: Array(grp.endTime - grp.startTime).fill(-1)
    });
  }
}
function initializeGrid(blocks, nSpaces, nStartTimes) {
  let { preAsn, unAsn } = blocks.reduce(
    ({ preAsn: preAsn2, unAsn: unAsn2 }, blk) => {
      if (blk.spacePath[0] == -1) {
        unAsn2.push(blk);
      } else {
        preAsn2.push(blk);
      }
      return { preAsn: preAsn2, unAsn: unAsn2 };
    },
    { preAsn: [], unAsn: [] }
  );
  const spacesByTimes = Array(nSpaces).fill(null).map(() => Array(nStartTimes).fill(false));
  for (let i = 0; i < preAsn.length; i++) {
    insertPreAssigned(spacesByTimes, preAsn[i]);
  }
  return { spacesByTimes, preAsn, unAsn };
}
function assignBlockSpacePaths(blocks, nSpaces, nStartTimes, maxTrials) {
  let state = initializeGrid(blocks, nSpaces, nStartTimes);
  let searchResult = searchForBestOrdering(maxTrials, state.spacesByTimes, state.unAsn);
  let assignResult = tryInsertUnassigned(state.spacesByTimes, searchResult.bestOrder);
  if (assignResult.failedIdx >= 0) {
    while (assignResult.failedIdx >= 0) {
      removeAssigned(state.spacesByTimes, searchResult.bestOrder);
      breakUpNextGroup(blocks);
      state = initializeGrid(blocks, nSpaces, nStartTimes);
      searchResult = searchForBestOrdering(maxTrials, state.spacesByTimes, state.unAsn);
      assignResult = tryInsertUnassigned(state.spacesByTimes, searchResult.bestOrder);
    }
  }
  return {
    status: assignResult.failedIdx == -1 ? "success" : "error",
    failedIdx: assignResult.failedIdx,
    bestOrder: searchResult.bestOrder,
    nTrials: searchResult.nTrials,
    nBreaks: assignResult.nBreaks
  };
}
function assignHourlySpaces(rsvs, dateStr, category) {
  const startEndTimes = getStartEndTimes(Settings, dateStr, category);
  const nStartTimes = startEndTimes.length - 1;
  let resourceNames;
  if (category == ReservationCategory.pool) {
    resourceNames = Settings.getPoolLanes(dateStr);
  } else {
    resourceNames = Settings.getClassrooms(dateStr);
  }
  const nSpaces = resourceNames.length;
  let blocks = createBuddyGroups(rsvs).map(
    (grp) => rsvsToBlock({ rsvs: grp, startEndTimes, category, resourceNames })
  );
  const MAX_TRIALS = 100;
  let result = assignBlockSpacePaths(blocks, nSpaces, nStartTimes, MAX_TRIALS);
  const schedule = blocksToDisplayData(blocks, nSpaces, nStartTimes);
  return { status: result.status, schedule };
}
const displayTag = (rsv, admin) => {
  let tag = get_store_value(users)[rsv.user.id].nickname;
  if (rsv.resType === "course") {
    tag += " +" + rsv.numStudents;
  }
  if (rsv.category === "openwater" && admin) {
    tag += " - " + rsv.maxDepth + "m";
  }
  return tag;
};
const badgeColor = (rsvs) => {
  const approved = rsvs.reduce((sts, rsv) => sts && rsv.status === "confirmed", true);
  return approved ? "bg-[#00FF00]" : "bg-[#FFFF00]";
};
function getDaySchedule(rsvs, datetime, category) {
  const today = datetimeToLocalDateStr(datetime);
  rsvs = rsvs.filter(
    (v) => ["pending", "confirmed"].includes(v.status) && v.category === category && v.date === today
  );
  return assignHourlySpaces(rsvs, today, category);
}
const adminView = (viewOnly) => {
  return get_store_value(user).privileges === "admin" && get_store_value(viewMode) === "admin" && viewOnly;
};
const isMyReservation = (rsv) => {
  return rsv == null || get_store_value(user).id === rsv.user.id;
};
const buoyDesc = (buoy) => {
  let desc = "";
  if (buoy.name === "auto")
    return desc;
  if (buoy.largeBuoy) {
    desc += "L";
  }
  if (buoy.pulley) {
    desc += "P";
  }
  if (buoy.bottomPlate) {
    desc += "B";
  }
  desc += buoy.maxDepth;
  return desc;
};
const resTypeModDisabled = (rsv) => rsv != null && rsv.resType != ReservationType.course;
const css = {
  code: "li.autocomplete-items.svelte-al4dou{list-style:none;border-bottom:1px solid #d4d4d4;z-index:99;cursor:pointer;background-color:#fff}li.autocomplete-items.svelte-al4dou:hover{background-color:DodgerBlue;color:white}li.autocomplete-items.svelte-al4dou:active{background-color:DodgerBlue !important;color:#ffffff}.autocomplete-active.svelte-al4dou{background-color:DodgerBlue !important;color:#ffffff}",
  map: null
};
const BuddyMatch = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { itemLabel } = $$props;
  let { highlighted } = $$props;
  if ($$props.itemLabel === void 0 && $$bindings.itemLabel && itemLabel !== void 0)
    $$bindings.itemLabel(itemLabel);
  if ($$props.highlighted === void 0 && $$bindings.highlighted && highlighted !== void 0)
    $$bindings.highlighted(highlighted);
  $$result.css.add(css);
  return `<li class="${["autocomplete-items svelte-al4dou", highlighted ? "autocomplete-active" : ""].join(" ").trim()}">${escape(itemLabel)}</li>`;
});
const PlusIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { svgClass = "" } = $$props;
  if ($$props.svgClass === void 0 && $$bindings.svgClass && svgClass !== void 0)
    $$bindings.svgClass(svgClass);
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${"w-4 h-4 " + escape(svgClass, true)}"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m6-6H6"></path></svg>`;
});
const DeleteIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { svgStyle = "" } = $$props;
  if ($$props.svgStyle === void 0 && $$bindings.svgStyle && svgStyle !== void 0)
    $$bindings.svgStyle(svgStyle);
  return `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${"h-4 w-4 " + escape(svgStyle, true)}"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path></svg>`;
});
const InputLabel = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { label = "" } = $$props;
  let { forInput = "" } = $$props;
  if ($$props.label === void 0 && $$bindings.label && label !== void 0)
    $$bindings.label(label);
  if ($$props.forInput === void 0 && $$bindings.forInput && forInput !== void 0)
    $$bindings.forInput(forInput);
  return `<li class="flex gap-2 mt-2"><div class="w-[70px] dark:text-white text-right mt-1"><label${add_attribute("for", forInput, 0)}>${escape(label)}</label></div>
	<div class="flex-1 flex items-center">${slots.default ? slots.default({}) : ``}</div></li>`;
});
const autocompUlStyle = "relative ml-2 top-0 border border-solid border-bg-gray-300 rounded text-sm";
const ResFormGeneric = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let maxBuddies;
  let buddyFields;
  let currentBF;
  let $user, $$unsubscribe_user;
  let $users, $$unsubscribe_users;
  let $canSubmit, $$unsubscribe_canSubmit;
  $$unsubscribe_user = subscribe(user, (value) => $user = value);
  $$unsubscribe_users = subscribe(users, (value) => $users = value);
  $$unsubscribe_canSubmit = subscribe(canSubmit, (value) => $canSubmit = value);
  let { rsv } = $$props;
  let { date = rsv?.date || PanglaoDate().toString() } = $$props;
  let { category = rsv?.category || ReservationCategory.pool } = $$props;
  let { viewOnly = false } = $$props;
  let { showBuddyFields = true } = $$props;
  let { restrictModify = false } = $$props;
  let { error = "" } = $$props;
  let { extendDisabled = false } = $$props;
  let { isAmFull = false } = $$props;
  let { discipline = "" } = $$props;
  let { diveTime = "" } = $$props;
  let { resType = null } = $$props;
  let disabled = viewOnly || restrictModify;
  let status = rsv?.status || ReservationStatus.pending;
  let comments = rsv?.comments || null;
  const initBF = () => {
    let buddyFields2 = [];
    if (rsv != null && rsv.buddies != null) {
      for (let i = 0; i < rsv.buddies.length; i++) {
        buddyFields2.push({
          // @ts-ignore - add proper user type to $users
          name: $users[rsv.buddies[i]].nickname,
          userId: rsv.buddies[i],
          id: i,
          matches: []
        });
      }
    }
    return buddyFields2;
  };
  let hiLiteIndex = 0;
  const bdColor = {
    [ReservationStatus.confirmed]: "dark:text-white bg-green-600",
    [ReservationStatus.pending]: "dark:text-white",
    [ReservationStatus.rejected]: "dark:text-white bg-red-600"
  };
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.viewOnly === void 0 && $$bindings.viewOnly && viewOnly !== void 0)
    $$bindings.viewOnly(viewOnly);
  if ($$props.showBuddyFields === void 0 && $$bindings.showBuddyFields && showBuddyFields !== void 0)
    $$bindings.showBuddyFields(showBuddyFields);
  if ($$props.restrictModify === void 0 && $$bindings.restrictModify && restrictModify !== void 0)
    $$bindings.restrictModify(restrictModify);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  if ($$props.extendDisabled === void 0 && $$bindings.extendDisabled && extendDisabled !== void 0)
    $$bindings.extendDisabled(extendDisabled);
  if ($$props.isAmFull === void 0 && $$bindings.isAmFull && isAmFull !== void 0)
    $$bindings.isAmFull(isAmFull);
  if ($$props.discipline === void 0 && $$bindings.discipline && discipline !== void 0)
    $$bindings.discipline(discipline);
  if ($$props.diveTime === void 0 && $$bindings.diveTime && diveTime !== void 0)
    $$bindings.diveTime(diveTime);
  if ($$props.resType === void 0 && $$bindings.resType && resType !== void 0)
    $$bindings.resType(resType);
  maxBuddies = category === ReservationCategory.openwater ? 3 : category === ReservationCategory.pool ? 1 : 0;
  buddyFields = initBF();
  currentBF = { name: "", matches: [] };
  {
    {
      if (rsv && rsv.comments && !comments) {
        comments = rsv.comments;
      }
    }
  }
  {
    {
      if (resType === ReservationType.competitionSetupCBS) {
        const disciplineRegex = /Discipline: [^\n]*/;
        const diveTimeRegex = /Dive Time: [^\n]*/;
        comments = (comments ?? "").replace(disciplineRegex, "").replace(diveTimeRegex, "").trim();
        if (discipline) {
          comments += `
Discipline: ${discipline}`;
        }
        if (diveTime) {
          comments += `
Dive Time: ${diveTime}`;
        }
        comments = comments.trim();
      }
    }
  }
  {
    if (!currentBF.name) {
      currentBF.matches = [];
      hiLiteIndex = 0;
    }
  }
  $$unsubscribe_user();
  $$unsubscribe_users();
  $$unsubscribe_canSubmit();
  return `

<div class="row w-full"><ul class="flex flex-col w-full px-8">
		<input type="hidden" name="user"${add_attribute("value", JSON.stringify({ id: $user.id }), 0)}>
		
		${viewOnly ? `${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formStatus", label: "Status" }, {}, {
    default: () => {
      return `<input type="hidden" name="status"${add_attribute("value", status, 0)}>
				<div${add_attribute("class", `p-1 bg-gray-600 w-full rounded-md ${bdColor[rsv?.status || ReservationStatus.pending]}`, 0)}>${escape(rsv?.status.toUpperCase())}</div>`;
    }
  })}` : ``}
		${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formDate", label: "Date" }, {}, {
    default: () => {
      return `<input type="hidden" name="date"${add_attribute("value", date, 0)}>
			<input type="date" name="date" id="formDate" class="w-full"${add_attribute("min", minValidDateStr(Settings, category), 0)}${add_attribute("max", maxValidDateStr(Settings), 0)} ${disabled ? "disabled" : ""}${add_attribute("value", date, 0)}>`;
    }
  })}
		${validate_component(InputLabel, "InputLabel").$$render(
    $$result,
    {
      forInput: "formCategory",
      label: "Category"
    },
    {},
    {
      default: () => {
        return `<input type="hidden" name="category"${add_attribute("value", category, 0)}>
			<select class="w-full" name="category" id="formCategory" ${disabled || rsv != null ? "disabled" : ""}><option${add_attribute("value", ReservationCategory.pool, 0)}>Pool</option><option${add_attribute("value", ReservationCategory.openwater, 0)}>Open Water</option><option${add_attribute("value", ReservationCategory.classroom, 0)}>Classroom</option></select>`;
      }
    }
  )}
		${slots.inputExtension ? slots.inputExtension({}) : ``}
		${showBuddyFields ? `${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "forBuddies", label: "Buddies" }, {}, {
    default: () => {
      return `<div class="flex flex-col w-full px-1"><ul class="flex flex-col">${each(buddyFields, (bf) => {
        return `<input type="hidden"${add_attribute("value", bf.userId, 0)} name="${"buddy" + escape(bf.id, true) + "_id"}">
							<div class="relative table"><div class="flex"><input${add_attribute("id", "buddy" + bf.id + "-input", 0)} type="text" class="w-[90%]" autocomplete="off" name="${"buddy" + escape(bf.id, true)}" ${disabled ? "disabled" : ""} tabindex="2"${add_attribute("value", bf.name, 0)}>
									${!viewOnly ? `<button class="dark:text-white p-0" style="vertical-align:inherit" type="button" ${disabled ? "disabled" : ""}>${validate_component(DeleteIcon, "DeleteIcon").$$render($$result, { svgStyle: "h-6 w-6" }, {}, {})}
										</button>` : ``}
								</div></div>
							${bf?.matches && bf?.matches?.length > 0 ? `<ul${add_attribute("class", autocompUlStyle, 0)}>${each(bf.matches, (m, i) => {
          return `${validate_component(BuddyMatch, "BuddyMatch").$$render(
            $$result,
            {
              itemLabel: m.nickname,
              highlighted: i === hiLiteIndex
            },
            {},
            {}
          )}`;
        })}
								</ul>` : ``}`;
      })}</ul>
					${!viewOnly ? `<button class="flex dark:text-white w-full max-w-[80px]" type="button" ${disabled || buddyFields.length == maxBuddies ? "disabled" : ""}>ADD
							${validate_component(PlusIcon, "PlusIcon").$$render($$result, { svgClass: "h-6 w-6" }, {}, {})}</button>` : ``}</div>`;
    }
  })}` : ``}
		${isMyReservation(rsv) || adminView(viewOnly) ? `${validate_component(InputLabel, "InputLabel").$$render(
    $$result,
    {
      forInput: "formComments",
      label: "Comment"
    },
    {},
    {
      default: () => {
        return `<textarea id="formComments" name="comments" class="w-44 xs:w-52 mb-4" tabindex="4" ${disabled ? "disabled" : ""}>${escape(comments || "")}</textarea>`;
      }
    }
  )}` : ``}</ul></div>
<div class="row w-full"><div class="column w-full">${slots.categoryOptionals ? slots.categoryOptionals({}) : ``}</div></div>

<input type="hidden" name="numBuddies"${add_attribute("value", buddyFields.length, 0)}>

<div class="row w-full"><div class="column w-full">${error ? `<div class="my-2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative w-fit left-1/2 -translate-x-2/4" role="alert"><span class="block sm:inline">${validate_component(ExclamationCircle, "ExclamationCircle").$$render($$result, {}, {}, {})}${escape(error)}</span></div>` : ``}
		<div class="text-right p-2"><button type="submit" class="bg-gray-100 disabled:text-gray-400 px-3 py-1" tabindex="6" ${!$canSubmit || extendDisabled ? "disabled" : ""} ${viewOnly ? "hidden" : ""}>${rsv ? `Update` : `Submit`}</button></div></div></div>`;
});
const ResFormPool = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let showBuddyFields;
  let $canSubmit, $$unsubscribe_canSubmit;
  $$unsubscribe_canSubmit = subscribe(canSubmit, (value) => $canSubmit = value);
  const lanes = () => Settings.getPoolLanes();
  const rooms = () => Settings.getClassrooms();
  let { rsv = null } = $$props;
  let { category = "pool" } = $$props;
  let { date = null } = $$props;
  let { dateFn = null } = $$props;
  let { resType = null } = $$props;
  let { viewOnly = false } = $$props;
  let { restrictModify = false } = $$props;
  let { maxNumStudents: maxNumStudents2 = 6 } = $$props;
  let { maxTimeHours: maxTimeHours2 = 4 } = $$props;
  let { error = "" } = $$props;
  let disabled = viewOnly || restrictModify;
  date = !rsv || !rsv?.date ? date ? date : dateFn(category) : rsv.date;
  const getStartTimes = (date2, category2) => {
    let startTs = startTimes(Settings, date2, category2);
    let today = PanglaoDate();
    if (!disabled && date2 === datetimeToLocalDateStr(today)) {
      let now = minuteOfDay(today);
      startTs = startTs.filter((time) => timeStrToMin(time) > now);
      if (startTs.length == 0) {
        startTs = startTimes(Settings, date2, category2);
      }
    }
    return startTs;
  };
  let chosenStart = rsv == null ? getStartTimes(date, category)[0] : rsv.startTime;
  let chosenEnd = rsv == null ? getStartTimes(date, category)[1] : rsv.endTime;
  let autoOrCourse = rsv == null ? resType == null ? ReservationType.autonomous : resType : rsv.resType;
  let numStudents = rsv == null || rsv.resType !== ReservationType.course ? 1 : rsv.numStudents;
  set_store_value(canSubmit, $canSubmit = true, $canSubmit);
  const validEndTime = (startTime, endTime) => {
    let start = timeStrToMin(startTime);
    let end = timeStrToMin(endTime);
    return end > start && end - start <= maxTimeHours2 * 60;
  };
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.dateFn === void 0 && $$bindings.dateFn && dateFn !== void 0)
    $$bindings.dateFn(dateFn);
  if ($$props.resType === void 0 && $$bindings.resType && resType !== void 0)
    $$bindings.resType(resType);
  if ($$props.viewOnly === void 0 && $$bindings.viewOnly && viewOnly !== void 0)
    $$bindings.viewOnly(viewOnly);
  if ($$props.restrictModify === void 0 && $$bindings.restrictModify && restrictModify !== void 0)
    $$bindings.restrictModify(restrictModify);
  if ($$props.maxNumStudents === void 0 && $$bindings.maxNumStudents && maxNumStudents2 !== void 0)
    $$bindings.maxNumStudents(maxNumStudents2);
  if ($$props.maxTimeHours === void 0 && $$bindings.maxTimeHours && maxTimeHours2 !== void 0)
    $$bindings.maxTimeHours(maxTimeHours2);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    showBuddyFields = autoOrCourse === "autonomous";
    $$rendered = `${validate_component(ResFormGeneric, "ResFormGeneric").$$render(
      $$result,
      {
        error,
        viewOnly,
        restrictModify,
        showBuddyFields,
        rsv,
        date,
        category
      },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {
        inputExtension: () => {
          return `${adminView(viewOnly) && category === "pool" ? `${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formLane", label: "Lane" }, {}, {
            default: () => {
              return `
				<select id="formLane" name="lane" class="w-full"${add_attribute("value", rsv?.lanes[0], 0)}><option value="auto">Auto</option>${each(lanes(), (lane) => {
                return `<option${add_attribute("value", lane, 0)}>${escape(lane)}</option>`;
              })}</select>`;
            }
          })}` : ``}
		${adminView(viewOnly) && category === "classroom" ? `${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formRoom", label: "Room" }, {}, {
            default: () => {
              return `<select id="formRoom" name="room" class="w-full"${add_attribute("value", rsv.room, 0)}><option value="auto">Auto</option>${each(rooms(), (room) => {
                return `<option${add_attribute("value", room, 0)}>${escape(room)}</option>`;
              })}</select>`;
            }
          })}` : ``}

		${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              forInput: "formStart",
              label: "Start Time"
            },
            {},
            {
              default: () => {
                return `<select id="formStart" class="w-full" ${disabled ? "disabled" : ""} name="startTime">${each(getStartTimes(date, category), (t) => {
                  return `<option${add_attribute("value", t, 0)}>${escape(t)}</option>`;
                })}</select>`;
              }
            }
          )}

		${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formEnd", label: "End Time" }, {}, {
            default: () => {
              return `<select id="formEnd" class="w-full" ${disabled ? "disabled" : ""} name="endTime"${add_attribute("value", chosenEnd, 0)}>${each(endTimes(Settings, date, category), (t) => {
                return `${validEndTime(chosenStart, t) ? `<option${add_attribute("value", t, 0)}>${escape(t)}</option>` : ``}`;
              })}</select>`;
            }
          })}

		${validate_component(InputLabel, "InputLabel").$$render($$result, { forInput: "formResType", label: "Type" }, {}, {
            default: () => {
              return `${viewOnly || resType != null || resTypeModDisabled(rsv) ? `<input type="hidden" name="resType"${add_attribute("value", autoOrCourse, 0)}>` : ``}
			<select id="formResType" class="w-full" ${viewOnly || resType != null || resTypeModDisabled(rsv) ? "disabled" : ""} name="resType"><option value="autonomous">Autonomous</option><option value="course">Course/Coaching</option></select>
			${resType != null ? `<input type="hidden" name="resType"${add_attribute("value", resType, 0)}>` : ``}`;
            }
          })}

		${autoOrCourse === "course" ? `${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              forInput: "formNumStudents",
              label: "# Students"
            },
            {},
            {
              default: () => {
                return `<select ${viewOnly ? "disabled" : ""}${add_attribute("value", numStudents, 0)} name="numStudents">${each([...Array(restrictModify ? numStudents : maxNumStudents2).keys()], (n) => {
                  return `<option${add_attribute("value", n + 1, 0)}>${escape(n + 1)}</option>`;
                })}</select>`;
              }
            }
          )}` : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_canSubmit();
  return $$rendered;
});
const maxNumStudents = 10;
const maxTimeHours = 6;
const ResFormClassroom = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { rsv = null } = $$props;
  let { category = "classroom" } = $$props;
  let { date = null } = $$props;
  let { dateFn = null } = $$props;
  let { restrictModify = false } = $$props;
  let { viewOnly = false } = $$props;
  let { error = "" } = $$props;
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.dateFn === void 0 && $$bindings.dateFn && dateFn !== void 0)
    $$bindings.dateFn(dateFn);
  if ($$props.restrictModify === void 0 && $$bindings.restrictModify && restrictModify !== void 0)
    $$bindings.restrictModify(restrictModify);
  if ($$props.viewOnly === void 0 && $$bindings.viewOnly && viewOnly !== void 0)
    $$bindings.viewOnly(viewOnly);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${validate_component(ResFormPool, "ResFormPool").$$render(
      $$result,
      {
        resType: "course",
        rsv,
        dateFn,
        restrictModify,
        viewOnly,
        maxNumStudents,
        maxTimeHours,
        error,
        date,
        category
      },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {}
    )}`;
  } while (!$$settled);
  return $$rendered;
});
const PUBLIC_STAGE = "dev";
const stage = PUBLIC_STAGE;
const defaultSetting = {
  ow_am_full: false
};
function listenToDateSetting(date, cb) {
  const dateSetting = doc(firestore, `date_settings_${stage}/${dayjs(date).format("YYYY-MM-DD")}`);
  return onSnapshot(dateSetting, (next) => {
    cb(next.data() || defaultSetting);
  });
}
function listenOnDateUpdate(date, category, cb) {
  const dateLockDoc = `locks/${category}_${dayjs(date).format("YYYY-MM-DD")}_${stage}`;
  const dateSetting = doc(firestore, dateLockDoc);
  return onSnapshot(dateSetting, (next) => {
    cb();
  });
}
const ResFormOpenWater = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let showBuddyFields;
  let sortedBuoys;
  let $reservations, $$unsubscribe_reservations;
  let $buoys, $$unsubscribe_buoys;
  let $canSubmit, $$unsubscribe_canSubmit;
  $$unsubscribe_reservations = subscribe(reservations, (value) => $reservations = value);
  $$unsubscribe_buoys = subscribe(buoys, (value) => $buoys = value);
  $$unsubscribe_canSubmit = subscribe(canSubmit, (value) => $canSubmit = value);
  let { rsv = null } = $$props;
  let { date = rsv?.date || PanglaoDate().toString() } = $$props;
  let { dateFn = null } = $$props;
  let { category = ReservationCategory.openwater } = $$props;
  let { viewOnly = false } = $$props;
  let { isModify = false } = $$props;
  let { restrictModify = false } = $$props;
  let { error = "" } = $$props;
  let disabled = viewOnly || restrictModify;
  date = rsv?.date || dateFn && dateFn(category) || date;
  let resType = rsv == null ? ReservationType.autonomous : rsv?.resType;
  let maxDepth = rsv?.maxDepth || void 0;
  let owTime = rsv?.owTime || "AM";
  let numStudents = rsv?.resType !== ReservationType.course ? 1 : rsv.numStudents;
  let pulley = rsv?.pulley;
  let extraBottomWeight = rsv?.extraBottomWeight || false;
  let bottomPlate = rsv?.bottomPlate || false;
  let largeBuoy = rsv?.largeBuoy || false;
  let discipline = null;
  let diveTime = null;
  let allowAutoAdjust = rsv?.allowAutoAdjust ?? true;
  function checkSubmit() {
    set_store_value(canSubmit, $canSubmit = maxDepth > 1, $canSubmit);
  }
  checkSubmit();
  const buoyIsAssignedTo = (buoyName, reservations2) => {
    const filteredReservations = $reservations.filter((other) => other.owTime === rsv.owTime && other.buoy === buoyName);
    return filteredReservations.map((r) => displayTag(r)).join(", ");
  };
  const minMax = {
    [ReservationType.course]: { min: 0, max: 89 },
    [ReservationType.autonomous]: { min: 15, max: 89 },
    [ReservationType.autonomousPlatform]: { min: 15, max: 99 },
    [ReservationType.autonomousPlatformCBS]: { min: 90, max: 130 },
    [ReservationType.cbs]: { min: 15, max: 130 },
    [ReservationType.proSafety]: { min: 0, max: 89 },
    [ReservationType.competitionSetupCBS]: { min: 15, max: 130 }
  };
  let unsubscribe;
  let isAmFull = false;
  const init = async () => {
    if (unsubscribe)
      unsubscribe();
    isAmFull = false;
    unsubscribe = listenToDateSetting(new Date(date), (setting) => {
      isAmFull = !!setting.ow_am_full;
    });
  };
  if ($$props.rsv === void 0 && $$bindings.rsv && rsv !== void 0)
    $$bindings.rsv(rsv);
  if ($$props.date === void 0 && $$bindings.date && date !== void 0)
    $$bindings.date(date);
  if ($$props.dateFn === void 0 && $$bindings.dateFn && dateFn !== void 0)
    $$bindings.dateFn(dateFn);
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.viewOnly === void 0 && $$bindings.viewOnly && viewOnly !== void 0)
    $$bindings.viewOnly(viewOnly);
  if ($$props.isModify === void 0 && $$bindings.isModify && isModify !== void 0)
    $$bindings.isModify(isModify);
  if ($$props.restrictModify === void 0 && $$bindings.restrictModify && restrictModify !== void 0)
    $$bindings.restrictModify(restrictModify);
  if ($$props.error === void 0 && $$bindings.error && error !== void 0)
    $$bindings.error(error);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    showBuddyFields = [
      ReservationType.autonomous,
      ReservationType.autonomousPlatform,
      ReservationType.autonomousPlatformCBS
    ].includes(resType);
    sortedBuoys = $buoys.sort((a, b) => a.maxDepth > b.maxDepth ? 1 : -1);
    {
      init();
    }
    $$rendered = `${validate_component(ResFormGeneric, "ResFormGeneric").$$render(
      $$result,
      {
        error,
        viewOnly,
        restrictModify,
        showBuddyFields,
        rsv,
        extendDisabled: isAmFull && owTime === "AM" && !rsv,
        discipline,
        diveTime,
        resType,
        isAmFull,
        date,
        category
      },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {
        categoryOptionals: () => {
          return `<div class="dark:text-white flex flex-col items-start pl-[70px]" slot="categoryOptionals"><div>${resType === ReservationType.autonomous ? `${disabled ? `<input type="hidden" name="pulley"${add_attribute("value", pulley ? "on" : "off", 0)}>` : ``}
				<input type="checkbox" id="formPulley" name="pulley" ${pulley ? "checked" : ""} ${disabled ? "disabled" : ""} tabindex="5">
				<label for="formPulley">pulley</label>` : `${resType === ReservationType.course ? `${disabled ? `<input type="hidden" name="pulley"${add_attribute("value", pulley == null ? null : pulley ? "on" : "off", 0)}>` : ``}
				<input type="radio" id="formPulley" name="pulley" value="on" ${pulley ? "checked" : ""} ${disabled ? "disabled" : ""}>
				<label for="formPulley">pulley</label>
				<input type="radio" id="formNoPulley" name="pulley" value="off" ${pulley == false ? "checked" : ""} ${disabled ? "disabled" : ""}>
				<label for="formNoPulley">no pulley</label>` : ``}`}</div>
		${[ReservationType.autonomous, ReservationType.course].includes(resType) ? `<div>${disabled ? `<input type="hidden" name="extraBottomWeight"${add_attribute("value", extraBottomWeight ? "on" : "off", 0)}>` : ``}
				<input type="checkbox" id="formBottomWeight" name="extraBottomWeight" ${extraBottomWeight ? "checked" : ""} ${disabled ? "disabled" : ""} tabindex="5">
				<label for="formBottomWeight">deep fim training</label></div>
			<div>${disabled ? `<input type="hidden" name="bottomPlate"${add_attribute("value", bottomPlate ? "on" : "off", 0)}>` : ``}
				<input type="checkbox" id="formBottomPlate" name="bottomPlate" ${bottomPlate ? "checked" : ""} ${disabled ? "disabled" : ""} tabindex="5">
				<label for="formBottomPlate">bottom plate</label></div>
			<div>${disabled ? `<input type="hidden" name="largeBuoy"${add_attribute("value", largeBuoy ? "on" : "off", 0)}>` : ``}
				<input type="checkbox" id="formLargeBuoy" name="largeBuoy" ${largeBuoy ? "checked" : ""} ${disabled ? "disabled" : ""} tabindex="5">
				<label for="formLargeBuoy">large buoy</label></div>` : ``}</div>`;
        },
        inputExtension: () => {
          return `${adminView(viewOnly) ? `${validate_component(InputLabel, "InputLabel").$$render($$result, { label: "Buoy", forInput: "formBuoy" }, {}, {
            default: () => {
              return `<select class="w-full" id="formBuoy" name="buoy"${add_attribute("value", rsv?.buoy, 0)}><option value="auto">Auto</option>${each(sortedBuoys, (buoy) => {
                return `<option${add_attribute("value", buoy.name, 0)}>${escape(buoy.name + " - " + buoyDesc(buoy))} - [${escape(buoyIsAssignedTo(buoy?.name))}]</option>`;
              })}</select>`;
            }
          })}` : ``}

		${validate_component(InputLabel, "InputLabel").$$render($$result, { label: "Type", forInput: "formResType" }, {}, {
            default: () => {
              return `<select id="formResType" ${viewOnly || resTypeModDisabled(rsv) ? "disabled" : ""} name="resType" class="w-full"><option value="course">Course/Coaching</option><option value="autonomous">Autonomous on Buoy (0-89m)</option><option value="autonomousPlatform">Autonomous on Platform (0-99m)</option><option value="autonomousPlatformCBS">Autonomous on Platform+CBS (90-130m)</option></select>
			${viewOnly || resTypeModDisabled(rsv) ? `<input type="hidden" name="resType"${add_attribute("value", resType, 0)}>` : ``}`;
            }
          })}

		${validate_component(InputLabel, "InputLabel").$$render($$result, { label: "Time", forInput: "formOwTime" }, {}, {
            default: () => {
              return `<div><select id="formOwTime" class="w-full" ${disabled ? "disabled" : ""} name="owTimeManual"><option value="AM">AM</option><option value="PM">PM</option></select>
				<input type="hidden" name="owTime"${add_attribute("value", owTime, 0)}>
				${isAmFull && owTime === "AM" && !isModify ? `<header class="bg-[#FF0000] text-white p-2 rounded-md">Morning session is full please book in the afternoon/PM instead.
					</header>` : ``}</div>`;
            }
          })}
		${isMyReservation(rsv) || adminView(viewOnly) ? `${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              label: "Target Depth",
              forInput: "formMaxDepth"
            },
            {},
            {
              default: () => {
                return `<input ${viewOnly || restrictModify && (resTypeModDisabled(rsv) || resType != ReservationType.autonomous) ? "disabled" : ""} type="number" id="formMaxDepth" class="w-[100px] valid:border-gray-500 required:border-red-500"${add_attribute("min", minMax[resType].min, 0)}${add_attribute("max", minMax[resType].max, 0)} name="maxDepth" ${maxDepth == void 0 ? "required" : ""}${add_attribute("value", maxDepth, 0)}>
				<div class="flex-1 text-sm dark:text-white text-left pl-2">meters</div>`;
              }
            }
          )}` : ``}
		${resType === "course" ? `${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              label: "# Students",
              forInput: "formNumStudents"
            },
            {},
            {
              default: () => {
                return `<select id="formNumStudents" ${viewOnly ? "disabled" : ""} name="numStudents"${add_attribute("value", numStudents, 0)}>${each([...Array(restrictModify ? numStudents : 4).keys()], (n) => {
                  return `<option${add_attribute("value", n + 1, 0)}>${escape(n + 1)}</option>`;
                })}</select>`;
              }
            }
          )}` : ``}

		${resType === "competitionSetupCBS" ? `${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              label: "Discipline",
              forInput: "formDiscipline"
            },
            {},
            {
              default: () => {
                return `<select id="formDiscipline" ${viewOnly ? "disabled" : ""} name="discipline" required><option value="FIM">FIM</option><option value="CNF">CNF</option><option value="CWT">CWT</option><option value="CWTB">CWTB</option></select>`;
              }
            }
          )}
			${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              label: "Dive Time",
              forInput: "formDiveTime"
            },
            {},
            {
              default: () => {
                return `<input ${viewOnly || restrictModify && resTypeModDisabled(rsv) ? "disabled" : ""} id="formDiveTime" class="w-[100px] text-white" name="diveTime" type="text" required${add_attribute("value", diveTime, 0)}>
				<div class="flex-1 text-sm dark:text-white text-left pl-2">minutes:seconds ie ( 4:30 )</div>`;
              }
            }
          )}` : ``}

		${resType === "autonomous" ? `${validate_component(InputLabel, "InputLabel").$$render(
            $$result,
            {
              label: "auto-adjust",
              forInput: "formAllowAutoAdjust"
            },
            {},
            {
              default: () => {
                return `${disabled ? `<input type="hidden" name="allowAutoAdjust"${add_attribute("value", allowAutoAdjust ? "on" : "off", 0)}>` : ``}
				<input type="checkbox" id="formAllowAutoAdjust" name="allowAutoAdjust" ${disabled ? "disabled" : ""}${add_attribute("checked", allowAutoAdjust, 1)}>
				<label form="formAllowAutoAdjust" class="dark:text-white">auto-adjust to closest depth if no similar buddy available</label>`;
              }
            }
          )}` : ``}`;
        }
      }
    )}`;
  } while (!$$settled);
  $$unsubscribe_reservations();
  $$unsubscribe_buoys();
  $$unsubscribe_canSubmit();
  return $$rendered;
});
const ReservationForm = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_reservations;
  $$unsubscribe_reservations = subscribe(reservations, (value) => value);
  let { category = "openwater" } = $$props;
  let { dateFn } = $$props;
  let { hasForm = false } = $$props;
  let { onSubmit = () => null } = $$props;
  let error = "";
  let date;
  getContext("simple-modal");
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.dateFn === void 0 && $$bindings.dateFn && dateFn !== void 0)
    $$bindings.dateFn(dateFn);
  if ($$props.hasForm === void 0 && $$bindings.hasForm && hasForm !== void 0)
    $$bindings.hasForm(hasForm);
  if ($$props.onSubmit === void 0 && $$bindings.onSubmit && onSubmit !== void 0)
    $$bindings.onSubmit(onSubmit);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${hasForm ? `<div class="px-2"><div class="form-title">reservation request</div>
		<form method="POST" action="/?/submitReservation">${category === "pool" ? `${validate_component(ResFormPool, "ResFormPool").$$render(
      $$result,
      { dateFn, error, date, category },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : `${category === "openwater" ? `${validate_component(ResFormOpenWater, "ResFormOpenWater").$$render(
      $$result,
      { dateFn, error, date, category },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : `${category === "classroom" ? `${validate_component(ResFormClassroom, "ResFormClassroom").$$render(
      $$result,
      { dateFn, error, date, category },
      {
        date: ($$value) => {
          date = $$value;
          $$settled = false;
        },
        category: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      },
      {}
    )}` : ``}`}`}</form></div>` : ``}`;
  } while (!$$settled);
  $$unsubscribe_reservations();
  return $$rendered;
});
const ReservationButton = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<svg class="group w-12 h-12 cursor-pointer" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg"><rect class="fill-stone-300 dark:fill-stone-600 group-hover:fill-stone-600 group-hover:dark:fill-stone-300" width="12" height="12" x="0" y="0" rx="3"></rect><path class="fill-stone-600 dark:fill-stone-300 group-hover:fill-stone-300 group-hover:dark:fill-stone-600" d="
      M 5.5 5.5
      l 0 -2
      a 0.7 0.7 0 0 1 1 0
      l 0 2
      l 2 0
      a 0.7 0.7 0 0 1 0 1
      l -2 0
      l 0 2
      a 0.7 0.7 0 0 1 -1 0
      l 0 -2
      l -2 0
      a 0.7 0.7 0 0 1 0 -1
      z"></path></svg>`;
});
const ReservationDialog = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { category = "openwater" } = $$props;
  let { dateFn } = $$props;
  let { onUpdate = () => {
  } } = $$props;
  const { open } = getContext("simple-modal");
  const showDialog = () => {
    open(ReservationForm, {
      category,
      dateFn,
      hasForm: true,
      onSubmit: onUpdate
    });
  };
  if ($$props.category === void 0 && $$bindings.category && category !== void 0)
    $$bindings.category(category);
  if ($$props.dateFn === void 0 && $$bindings.dateFn && dateFn !== void 0)
    $$bindings.dateFn(dateFn);
  if ($$props.onUpdate === void 0 && $$bindings.onUpdate && onUpdate !== void 0)
    $$bindings.onUpdate(onUpdate);
  if ($$props.showDialog === void 0 && $$bindings.showDialog && showDialog !== void 0)
    $$bindings.showDialog(showDialog);
  return `<div>${validate_component(ReservationButton, "ReservationButton").$$render($$result, {}, {}, {})}</div>`;
});

export { ReservationDialog as R, listenOnDateUpdate as a, badgeColor as b, buoyDesc as c, displayTag as d, ResFormPool as e, ResFormOpenWater as f, getDaySchedule as g, ResFormClassroom as h, adminView as i, listenToDateSetting as l };
//# sourceMappingURL=ReservationDialog-6b6eda34.js.map
