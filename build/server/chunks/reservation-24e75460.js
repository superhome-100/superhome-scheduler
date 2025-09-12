import { R as ReservationType, a as ReservationCategory, O as OWTime, b as ReservationStatus } from './settings-a7eb4ae9.js';
import { t as timeStrToMin, i as isValidProSafetyCutoff } from './datetimeUtils-b60811f0.js';
import { g as getXataClient } from './xata-old-ddfee38d.js';
import { b as beforeResCutoff, a as beforeCancelCutoff, g as getStartEndTimes, c as getNumberOfOccupants } from './reservations-a581989b.js';
import { i as initSettings } from './settings2-3108d47d.js';
import { a as getDateSetting } from './firestore-df2a73b8.js';
import { c as getUsersById } from './user-7520bd1c.js';
import { a as assignRsvsToBuoys } from './assignRsvsToBuoys-33e33a44.js';
import _ from 'lodash';
import dayjs from 'dayjs';
import ObjectsToCsv from 'objects-to-csv';

function getTimeSlots({
  settings,
  date,
  category,
  start,
  end
}) {
  let times = getStartEndTimes(settings, date, category);
  let sIdx = times.indexOf(start);
  let eIdx = times.indexOf(end);
  if (sIdx == -1 && eIdx == -1) {
    return null;
  }
  if (sIdx == -1) {
    sIdx = 0;
  }
  if (eIdx == -1) {
    eIdx = times.length - 1;
  }
  let beforeStart = times.slice(0, sIdx);
  let startVals = times.slice(sIdx, eIdx);
  let endVals = times.slice(sIdx + 1, eIdx + 1);
  let afterEnd = times.slice(eIdx + 1);
  return { startVals, endVals, beforeStart, afterEnd };
}
function isTimeOverlapping({
  startA,
  endA,
  startB,
  endB
}) {
  const startAMin = timeStrToMin(startA);
  const startBMin = timeStrToMin(startB);
  const endAMin = timeStrToMin(endA);
  const endBMin = timeStrToMin(endB);
  return startAMin >= startBMin && startAMin < endBMin || endAMin <= endBMin && endAMin > startBMin || startAMin < startBMin && endAMin > endBMin;
}
function getTimeOverlapFilters(settings, rsv) {
  let owAmStart = settings.getOpenwaterAmStartTime(rsv.date);
  let owAmEnd = settings.getOpenwaterAmEndTime(rsv.date);
  let owPmStart = settings.getOpenwaterPmStartTime(rsv.date);
  let owPmEnd = settings.getOpenwaterPmEndTime(rsv.date);
  let start, end;
  let owTimes = [];
  if ([ReservationCategory.pool, ReservationCategory.classroom].includes(rsv.category)) {
    start = rsv.startTime;
    end = rsv.endTime;
    if (isTimeOverlapping({
      startA: start,
      endA: end,
      startB: owAmStart,
      endB: owAmEnd
    })) {
      owTimes.push(OWTime.AM);
    }
    if (isTimeOverlapping({
      startA: start,
      endA: end,
      startB: owPmStart,
      endB: owPmEnd
    })) {
      owTimes.push(OWTime.PM);
    }
  } else if (rsv.category === ReservationCategory.openwater) {
    owTimes.push(rsv.owTime);
    if (rsv.owTime === OWTime.AM) {
      start = owAmStart;
      end = owAmEnd;
    } else if (rsv.owTime === OWTime.PM) {
      start = owPmStart;
      end = owPmEnd;
    } else {
      throw new Error("invalid OWTime: " + rsv.owTime);
    }
  } else {
    throw new Error("invalid reservation category: " + rsv.category);
  }
  const filters = [];
  if (owTimes.length > 0) {
    filters.push({
      category: ReservationCategory.openwater,
      owTime: { $any: owTimes }
    });
  }
  for (let cat of [ReservationCategory.pool, ReservationCategory.classroom]) {
    let slots = getTimeSlots({
      settings,
      date: rsv.date,
      category: cat,
      start,
      end
    });
    if (slots != null) {
      let timeFilt = [];
      if (slots.startVals.length > 0) {
        timeFilt.push({ startTime: { $any: slots.startVals } });
      }
      if (slots.endVals.length > 0) {
        timeFilt.push({ endTime: { $any: slots.endVals } });
      }
      if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
        timeFilt.push({
          $all: [{ startTime: { $any: slots.beforeStart } }, { endTime: { $any: slots.afterEnd } }]
        });
      }
      if (timeFilt.length > 0) {
        filters.push({
          category: cat,
          $any: timeFilt
        });
      }
    }
  }
  return filters;
}
class ValidationError extends Error {
}
const client$1 = getXataClient();
function getStartTime(settings, sub) {
  if (sub.category === ReservationCategory.openwater) {
    if (sub.owTime === OWTime.AM) {
      return settings.getOpenwaterAmStartTime(sub.date);
    } else if (sub.owTime === OWTime.PM) {
      return settings.getOpenwaterPmStartTime(sub.date);
    } else {
      throw new Error("unknown owTime value: " + sub.owTime);
    }
  } else {
    return sub.startTime;
  }
}
const reducingStudents = (orig, sub) => orig.resType === ReservationType.course && orig.numStudents > sub.numStudents;
const removingBuddy = (orig, sub) => orig.resType === ReservationType.autonomous && orig.buddies.length > sub.buddies.length && sub.buddies.reduce((val, id) => orig.buddies.includes(id) && val, true);
const changingCourseToAutonomous = (orig, sub) => orig.resType == ReservationType.course && sub.resType == ReservationType.autonomous && sub.buddies.length == 0;
function throwIfPastUpdateTime(settings, orig, sub) {
  let startTime = getStartTime(settings, sub);
  if (!beforeResCutoff(settings, sub.date, startTime, sub.category)) {
    const cutoffError = "The modification window for this reservation date/time has expired; this reservation can no longer be modified";
    if (!reducingStudents(orig, sub) && !removingBuddy(orig, sub) && !changingCourseToAutonomous(orig, sub)) {
      throw new ValidationError(cutoffError);
    } else if (!beforeCancelCutoff(settings, sub.date, startTime, sub.category)) {
      throw new ValidationError(cutoffError);
    }
  }
}
function isMyBuddysReservation(rsv, sub) {
  if (sub.buddies && sub.buddies.includes(rsv.user.id)) {
    if ([ReservationCategory.pool, ReservationCategory.classroom].includes(sub.category)) {
      return rsv.category === sub.category && rsv.startTime === sub.startTime && rsv.endTime === sub.endTime;
    } else if (sub.category === ReservationCategory.openwater) {
      return rsv.category === sub.category && rsv.owTime === sub.owTime;
    } else {
      throw new Error("invalid category: " + sub.category);
    }
  } else {
    return false;
  }
}
function throwIfOverlappingReservation(sub, allOverlappingRsvs, userIds) {
  let userOverlapping = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user.id));
  for (let rsv of userOverlapping) {
    let notThisRsv = rsv.id !== sub.id;
    let notBuddyOfThisRsv = !isMyBuddysReservation(rsv, sub);
    if (notThisRsv && notBuddyOfThisRsv) {
      throw new ValidationError(
        "You or one of your buddies has a pre-existing reservation at this time"
      );
    }
  }
}
function checkOWSpaceAvailable(buoys, sub, existingReservations) {
  let buddyGroup = simulateBuddyGroup(sub);
  let { unassigned } = assignRsvsToBuoys(buoys, [...buddyGroup, ...existingReservations]);
  if (unassigned.length > 0) {
    return {
      status: "error",
      message: "All buoys are fully booked at this time.  Please either check back later or try a different date/time"
    };
  } else {
    return { status: "success" };
  }
}
function checkPoolSpaceAvailable(settings, sub, overlapping) {
  let startEndTs = getStartEndTimes(settings, sub.date, sub.category);
  for (let i = startEndTs.indexOf(sub.startTime); i < startEndTs.indexOf(sub.endTime); i++) {
    let time = timeStrToMin(startEndTs[i]);
    let thisSlotOverlap = overlapping.filter((rsv) => {
      let start = timeStrToMin(rsv.startTime);
      let end = timeStrToMin(rsv.endTime);
      return start <= time && end > time;
    });
    let numDivers = getNumberOfOccupants([...thisSlotOverlap, sub]) + sub.buddies.length;
    let nLanes = settings.getPoolLanes(sub.date).length;
    if (numDivers > nLanes) {
      return {
        status: "error",
        message: "All pool lanes are booked at this time.  Please either check back later or try a different date/time"
      };
    }
  }
  return { status: "success" };
}
const checkClassroomAvailable = (settings, sub, overlapping) => {
  if (overlapping.length >= settings.getClassrooms(sub.date).length) {
    return {
      status: "error",
      message: "All classrooms are booked at this time.  Please either check back later or try a different date/time"
    };
  } else {
    return { status: "success" };
  }
};
function simulateBuddyGroup(sub) {
  let simId = -1;
  let owner = {
    ...sub,
    id: (simId--).toString(),
    buoy: sub.resType === ReservationType.cbs ? "CBS" : "auto"
  };
  let simBuds = [];
  for (let id of owner.buddies) {
    let buddies = [owner.user.id, ...owner.buddies.filter((thisId) => thisId != id)];
    simBuds.push({
      ...owner,
      id: simId--,
      user: { id },
      buddies
    });
  }
  return [owner, ...simBuds];
}
const throwIfUserIsDisabled = async (userIds) => {
  const users = await getUsersById(userIds);
  users.map((user) => {
    if (user == null)
      throw new Error("invalid user Id");
    if (user.status === "disabled") {
      throw new ValidationError(
        `Please contact the admin to activate the account for ${user.nickname}`
      );
    }
  });
};
async function throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs, ignore = []) {
  let result;
  let catOverlapping = allOverlappingRsvs.filter((rsv) => rsv.category === sub.category && !ignore.includes(rsv.id)).map((rsv) => {
    return { ...rsv };
  });
  if (sub.category === ReservationCategory.openwater) {
    let buoys = await client$1.db.Buoys.getAll();
    result = checkOWSpaceAvailable(buoys, sub, catOverlapping);
  } else if (sub.category === ReservationCategory.pool) {
    result = checkPoolSpaceAvailable(settings, sub, catOverlapping);
  } else if (sub.category === ReservationCategory.classroom) {
    result = checkClassroomAvailable(settings, sub, catOverlapping);
  } else {
    throw new Error(`invalid category ${sub.category}`);
  }
  if (result.status === "error") {
    throw new ValidationError(result.message);
  }
}
const client = getXataClient();
async function getReservationsCsv(branch) {
  const client2 = getXataClient(branch);
  const fields = [
    "user.name",
    "user.nickname",
    "date",
    "category",
    "price",
    "status",
    "resType",
    "numStudents",
    "owTime",
    "startTime",
    "endTime"
  ];
  let dateStr = dayjs().month(dayjs().month() - 1).startOf("month").locale("en-US").format("YYYY-MM-DD");
  let records = await client2.db.Reservations.select(["*", "user.*"]).filter({
    //@ts-ignore
    date: { $ge: dateStr }
  }).select(fields).getAll();
  records = records.map((rsv) => {
    let numStudents = rsv.numStudents;
    if (rsv.resType == ReservationType.autonomous) {
      numStudents = 1;
    }
    let owTime = rsv.owTime;
    if (rsv.category != ReservationCategory.openwater) {
      if (timeStrToMin(rsv.startTime) < 720) {
        owTime = OWTime.AM;
      } else {
        owTime = OWTime.PM;
      }
    }
    return { ...rsv, owTime, numStudents };
  });
  const csv = new ObjectsToCsv(
    records.map((ent) => {
      return {
        ..._.omit(ent, ["user"]),
        name: _.get(ent, "user.name", "no name"),
        nickname: _.get(ent, "user.nickname", "no name")
      };
    })
  );
  return await csv.toString();
}
const throwIfNull = (rsv, field) => {
  if (rsv[field] == null) {
    throw new Error(`invalid null value for ${field} in reservation ${rsv.id}`);
  }
};
function throwIfReservationIsInvalid(rsv) {
  if (rsv == null)
    throw new Error("null reservation");
  if (!Object.keys(ReservationCategory).includes(rsv.category)) {
    throw new Error(`invalid reservation category "${rsv.category}" for ${rsv.id}`);
  } else {
    if (rsv.category == ReservationCategory.openwater) {
      if (!Object.keys(OWTime).includes(rsv.owTime)) {
        throw new Error(`invalid owTime "${rsv.owTime}" for ${rsv.id}`);
      }
      throwIfNull(rsv, "maxDepth");
      throwIfNull(rsv, "buoy");
    } else {
      throwIfNull(rsv, "startTime");
      throwIfNull(rsv, "endTime");
    }
  }
  if (!Object.keys(ReservationType).includes(rsv.resType)) {
    throw new Error(`invalid reservation type "${rsv.resType}" for ${rsv.id}`);
  } else {
    if (rsv.resType == ReservationType.course) {
      throwIfNull(rsv, "numStudents");
    }
  }
  if (!Object.keys(ReservationStatus).includes(rsv.status)) {
    throw new Error(`invalid reservation status "${rsv.status}" for ${rsv.id}`);
  }
  throwIfNull(rsv, "user");
  return rsv;
}
const getAugmentedRsv = (settings, rsv) => {
  let buddies = rsv.buddies;
  let startTime = rsv.startTime;
  let endTime = rsv.endTime;
  if (buddies == null) {
    buddies = [];
  }
  if (rsv.category === ReservationCategory.openwater) {
    if (rsv.owTime === OWTime.AM) {
      startTime = settings.getOpenwaterAmStartTime(rsv.date);
      endTime = settings.getOpenwaterAmEndTime(rsv.date);
    } else if (rsv.owTime === OWTime.PM) {
      startTime = settings.getOpenwaterPmStartTime(rsv.date);
      endTime = settings.getOpenwaterPmEndTime(rsv.date);
    }
  }
  return {
    ...rsv,
    buddies,
    startTime,
    endTime
  };
};
async function convertFromXataToAppType(rawRsvs) {
  const settings = await initSettings();
  let reservations = rawRsvs.map((rsv) => throwIfReservationIsInvalid(rsv));
  return reservations.map((rsv) => {
    return getAugmentedRsv(settings, rsv);
  });
}
function categoryIsBookable(settings, sub) {
  let isBookable = false;
  switch (sub.category) {
    case ReservationCategory.pool:
      isBookable = settings.getPoolBookable(sub.date);
      break;
    case ReservationCategory.openwater:
      if (sub.owTime == OWTime.AM) {
        isBookable = settings.getOpenwaterAmBookable(sub.date);
      } else {
        isBookable = settings.getOpenwaterPmBookable(sub.date);
      }
      break;
    case ReservationCategory.classroom:
      isBookable = settings.getClassroomBookable(sub.date);
      break;
  }
  return isBookable;
}
async function getOverlappingReservations(sub) {
  const settings = await initSettings();
  const filters = {
    date: sub.date,
    $any: getTimeOverlapFilters(settings, sub),
    status: { $any: [ReservationStatus.pending, ReservationStatus.confirmed] }
  };
  const overlapping = await client.db.Reservations.filter(filters).getAll();
  return await convertFromXataToAppType(overlapping);
}
async function getUserOverlappingReservations(sub, userIds) {
  let overlapping = await getOverlappingReservations(sub);
  return overlapping.filter((rsv) => userIds.includes(rsv.user.id));
}
async function throwIfSubmissionIsInvalid(sub) {
  const settings = await initSettings();
  if (!settings.getOpenForBusiness(sub.date)) {
    throw new ValidationError("We are closed on this date; please choose a different date");
  }
  if (!categoryIsBookable(settings, sub)) {
    throw new ValidationError(
      `The ${sub.category} is not bookable on this date; please choose a different date`
    );
  }
  let userIds = [sub.user.id, ...sub.buddies];
  await throwIfUserIsDisabled(userIds);
  if (sub.resType === "proSafety") {
    const isValid = isValidProSafetyCutoff(sub.date);
    if (!isValid)
      throw new ValidationError("PRO_SAFETY reservation should be done before 4PM.");
  }
  if (!beforeResCutoff(settings, sub.date, getStartTime(settings, sub), sub.category)) {
    throw new ValidationError(
      "The submission window for this reservation date/time has expired. Please choose a later date."
    );
  }
  let allOverlappingRsvs = await getOverlappingReservations(sub);
  let userOverlappingRsvs = allOverlappingRsvs.filter((rsv) => userIds.includes(rsv.user.id));
  if (userOverlappingRsvs.length > 0) {
    throw new ValidationError(
      "You or one of your buddies has a pre-existing reservation at this time"
    );
  }
  const day = dayjs(sub.date).day();
  const tuesday = 2;
  const friday = 5;
  const competitionSetupDays = [tuesday, friday];
  if ([ReservationType.autonomousPlatformCBS, ReservationType.autonomousPlatform].includes(
    sub.resType
  )) {
    if (sub.buddies?.length < 2) {
      throw new ValidationError(`Booking this training type requires a minimum of 2 buddies.`);
    }
  }
  if (ReservationType.competitionSetupCBS === sub.resType && !competitionSetupDays.includes(day)) {
    throw new ValidationError(
      "Competition setup training is available only during Tuesdays and Fridays"
    );
  }
  await throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs);
}
function createBuddyEntriesForSubmit(sub) {
  let entries = [sub];
  if (sub.buddies.length > 0) {
    let { user, buddies, ...common } = sub;
    for (let id of buddies) {
      let bg = [user.id, ...buddies.filter((bid) => bid != id)];
      entries.push({ ...common, user: { id }, buddies: bg, owner: false });
    }
  }
  return entries;
}
const buoyCBS = "CBS";
const onCBSBuoy = [
  ReservationType.cbs,
  ReservationType.competitionSetupCBS,
  ReservationType.autonomousPlatformCBS
];
const getBuoy = (resType) => onCBSBuoy.includes(resType) ? buoyCBS : "auto";
function unpackSubmitForm(formData) {
  const category = ReservationCategory[formData.get("category")];
  const status = category == ReservationCategory.openwater ? ReservationStatus.pending : ReservationStatus.confirmed;
  const resType = ReservationType[formData.get("resType")];
  const buoy = getBuoy(resType);
  return {
    user: JSON.parse(formData.get("user")),
    date: formData.get("date"),
    category,
    resType,
    buddies: JSON.parse(formData.get("buddies")),
    comments: formData.get("comments"),
    numStudents: JSON.parse(formData.get("numStudents")),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    owTime: OWTime[formData.get("owTime")],
    maxDepth: JSON.parse(formData.get("maxDepth")),
    pulley: formData.has("pulley") ? formData.get("pulley") == "on" : null,
    extraBottomWeight: formData.get("extraBottomWeight") == "on",
    bottomPlate: formData.get("bottomPlate") == "on",
    largeBuoy: formData.get("largeBuoy") == "on",
    O2OnBuoy: formData.get("O2OnBuoy") == "on",
    shortSession: formData.get("shortSession") == "on",
    owner: true,
    status,
    buoy,
    lanes: ["auto"],
    allowAutoAdjust: ["on", "true"].includes(formData.get("allowAutoAdjust"))
  };
}
async function submitReservation(formData) {
  const sub = unpackSubmitForm(formData);
  await throwIfSubmissionIsInvalid(sub);
  let entries = createBuddyEntriesForSubmit(sub);
  const createdReservations = await client.db.Reservations.create(entries);
  let records = await convertFromXataToAppType(createdReservations);
  return { records };
}
async function throwIfUpdateIsInvalid(sub, orig, ignore, isAMFull) {
  const settings = await initSettings();
  if (!settings.getOpenForBusiness(sub.date)) {
    throw new ValidationError("We are closed on this date; please choose a different date");
  }
  if (!categoryIsBookable(settings, sub)) {
    throw new ValidationError(
      `The ${sub.category} is not bookable on this date; please choose a different date`
    );
  }
  throwIfPastUpdateTime(settings, orig, sub);
  let allOverlappingRsvs = await getOverlappingReservations(sub);
  let userIds = [sub.user.id, ...sub.buddies];
  throwIfOverlappingReservation(orig, allOverlappingRsvs, userIds);
  if (sub.resType === ReservationType.course && sub.category === ReservationCategory.openwater) {
    if (isAMFull && sub.numStudents > orig.numStudents && sub.owTime === OWTime.AM) {
      throw new ValidationError("The morning open water session is full for this date cannot increase the number of students.");
    }
  }
  await throwIfNoSpaceAvailable(settings, sub, allOverlappingRsvs, ignore);
}
async function createBuddyEntriesForUpdate(sub, orig) {
  let buddySet = /* @__PURE__ */ new Set([...sub.buddies, ...orig.buddies]);
  let modify = [sub];
  let create = [];
  let cancel = [];
  if (buddySet.size > 0) {
    let rsvIdByUserId = {};
    let { id, user, buddies, ...common } = sub;
    delete common.createdAt;
    if (orig.buddies.length > 0) {
      let buddyRsvs = await getUserOverlappingReservations(orig, orig.buddies);
      rsvIdByUserId = buddyRsvs.reduce((obj, rsv) => {
        obj[rsv.user.id] = rsv.id;
        return obj;
      }, {});
    }
    const getBuddyField = (myId) => [
      user.id,
      ...buddies.filter((bId) => bId != myId)
    ];
    for (let bId of buddySet) {
      if (buddies.includes(bId) && orig.buddies.includes(bId)) {
        let entry = {
          ...common,
          id: rsvIdByUserId[bId],
          user: { id: bId },
          buddies: getBuddyField(bId),
          owner: false
        };
        modify.push(entry);
      } else if (buddies.includes(bId)) {
        let entry = {
          ...common,
          createdAt: common.updatedAt,
          user: { id: bId },
          buddies: getBuddyField(bId),
          owner: false
        };
        create.push(entry);
      } else {
        cancel.push(rsvIdByUserId[bId]);
      }
    }
  }
  return { modify, create, cancel };
}
async function unpackModifyForm(formData, orig) {
  const status = orig.category == ReservationCategory.openwater ? ReservationStatus.pending : ReservationStatus.confirmed;
  const settings = await initSettings();
  const brc = beforeResCutoff(settings, orig.date, getStartTime(settings, orig), orig.category);
  const resType = formData.has("resType") ? ReservationType[formData.get("resType")] : orig.resType;
  const buoy = getBuoy(resType);
  return {
    id: formData.get("id"),
    date: formData.get("date"),
    category: orig.category,
    //can't be changed
    startTime: formData.has("startTime") ? formData.get("startTime") : orig.startTime,
    endTime: formData.has("endTime") ? formData.get("endTime") : orig.endTime,
    owTime: formData.has("owTime") ? OWTime[formData.get("owTime")] : orig.owTime,
    resType,
    numStudents: formData.has("numStudents") ? JSON.parse(formData.get("numStudents")) : orig.numStudents,
    maxDepth: formData.has("maxDepth") ? JSON.parse(formData.get("maxDepth")) : orig.maxDepth,
    comments: formData.has("comments") ? formData.get("comments") : orig.comments,
    user: orig.user,
    //can't change
    buddies: JSON.parse(formData.get("buddies")),
    //buddy updates are dealt with later
    pulley: formData.has("pulley") ? formData.get("pulley") == "on" : null,
    extraBottomWeight: formData.get("extraBottomWeight") == "on",
    bottomPlate: formData.get("bottomPlate") == "on",
    largeBuoy: formData.get("largeBuoy") == "on",
    O2OnBuoy: formData.get("O2OnBuoy") == "on",
    shortSession: formData.get("shortSession") == "on",
    createdAt: orig.createdAt,
    owner: true,
    status,
    lanes: brc ? ["auto"] : orig.lanes,
    buoy,
    room: brc ? "auto" : orig.room,
    price: orig.price,
    updatedAt: /* @__PURE__ */ new Date(),
    allowAutoAdjust: ["on", "true"].includes(formData.get("allowAutoAdjust"))
  };
}
async function modifyReservation(formData) {
  let id = formData.get("id");
  let [orig] = await convertFromXataToAppType([await client.db.Reservations.read(id)]);
  let sub = await unpackModifyForm(formData, orig);
  const settingDate = await getDateSetting(sub.date);
  let { create, modify, cancel } = await createBuddyEntriesForUpdate(sub, orig);
  if (settingDate?.ow_am_full && sub.owTime === OWTime.AM) {
    if (create.length > 0) {
      throw new ValidationError("The morning open water session is full for this date cannot add a buddy.");
    } else if (modify.length > 0 && (sub.date !== orig.date || orig.owTime !== sub.owTime)) {
      throw new ValidationError("The morning open water session is full for this date cannot change to that date or time.");
    }
  }
  let existing = [...modify.map((rsv) => rsv.id), ...cancel];
  await throwIfUpdateIsInvalid(sub, orig, existing, settingDate?.ow_am_full ?? false);
  let records = {
    created: [],
    canceled: []
  };
  if (orig.buoy !== "auto") {
    modify[0].buoy = orig.buoy;
  }
  if (sub.resType === ReservationType.course && orig.numStudents !== sub.numStudents) {
    modify[0].status = ReservationStatus.pending;
    if (ReservationCategory.openwater !== sub.category) {
      modify[0].status = orig.status;
    }
  }
  let modrecs = await client.db.Reservations.update(modify);
  records.modified = await convertFromXataToAppType(modrecs);
  if (create.length > 0) {
    let createrecs = await client.db.Reservations.create(create);
    records.created = await convertFromXataToAppType(createrecs);
  }
  if (cancel.length > 0) {
    let cancelrecs = await client.db.Reservations.update(
      cancel.map((id2) => {
        return { id: id2, status: ReservationStatus.canceled };
      })
    );
    records.canceled = await convertFromXataToAppType(cancelrecs);
  }
  return { records };
}
async function adminUpdate(formData) {
  let rsv = {};
  let id = formData.get("id");
  let existing = await client.db.Reservations.read(id);
  if (existing.status != ReservationStatus.canceled) {
    rsv.status = formData.get("status");
  }
  const cat = formData.get("category");
  if (cat === "pool") {
    rsv.lanes = [formData.get("lane")];
  } else if (cat === "openwater") {
    rsv.buoy = formData.get("buoy");
  } else if (cat === "classroom") {
    rsv.room = formData.get("room");
  }
  let record = await client.db.Reservations.update(id, rsv);
  return record;
}
async function throwIfInvalidCancellation(data) {
  const settings = await initSettings();
  if (!beforeCancelCutoff(settings, data.date, data.startTime, data.category)) {
    throw new ValidationError(
      "The cancellation window for this reservation has expired; this reservation can no longer be canceled"
    );
  }
}
async function cancelReservation(formData) {
  let id = formData.get("id");
  let buddiesToCancel = JSON.parse(formData.get("cancelBuddies"));
  let [sub] = await convertFromXataToAppType([await client.db.Reservations.read(id)]);
  await throwIfInvalidCancellation(sub);
  let save = sub.buddies.filter((id2) => !buddiesToCancel.includes(id2));
  let cancel = [sub.id];
  let records = {
    modified: []
  };
  if (sub.buddies.length > 0) {
    let existing = await getUserOverlappingReservations(sub, sub.buddies);
    let modify = existing.filter((rsv) => save.includes(rsv.user.id)).map((rsv) => {
      let buddies = save.filter((id2) => id2 != rsv.user.id);
      return { ...rsv, buddies };
    });
    if (modify.length > 0) {
      if (modify.reduce((b, rsv) => b || rsv.owner, false) == false) {
        modify[0].owner = true;
      }
      let modrecs = await client.db.Reservations.update(modify);
      records.modified = await convertFromXataToAppType(modrecs);
    }
    cancel = cancel.concat(
      existing.filter((rsv) => !save.includes(rsv.user.id)).map((rsv) => rsv.id)
    );
  }
  let cancelrecs = await client.db.Reservations.update(
    cancel.map((id2) => {
      return { id: id2, status: "canceled" };
    })
  );
  records.canceled = await convertFromXataToAppType(cancelrecs);
  return { records };
}
async function approveAllPendingReservations(category, date) {
  const filters = {
    date,
    category,
    status: ReservationStatus.pending
  };
  console.info("Approving all pending reservations for", category, date);
  const pending = await client.db.Reservations.filter(filters).getAll();
  const approved = pending.map((rsv) => {
    return {
      ...rsv,
      status: ReservationStatus.confirmed
    };
  });
  await client.db.Reservations.update(approved);
}

export { ValidationError as V, adminUpdate as a, approveAllPendingReservations as b, cancelReservation as c, convertFromXataToAppType as d, getReservationsCsv as g, modifyReservation as m, submitReservation as s };
//# sourceMappingURL=reservation-24e75460.js.map
