import { timeStrToMin } from '$lib/datetimeUtils.js';
import { startTimes, endTimes } from '$lib/ReservationTimes.js';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
import { get } from 'svelte/store';
import { users } from '$lib/stores.js';

function getTimeSlots(settings, date, category, start, end) {
    let sTs = startTimes(settings, date, category);
    let eTs = endTimes(settings, date, category);
    let times = [...sTs, eTs[eTs.length-1]];

    let sIdx = times.indexOf(start);
    let eIdx = times.indexOf(end);
    if (sIdx == -1 && eIdx == -1) {
        return null;
    }

    if (sIdx == -1) {
        sIdx = 0;
    }
    if (eIdx == -1) {
        eIdx = times.length-1;
    }

    let beforeStart = times.slice(0, sIdx);
    let startVals = times.slice(sIdx, eIdx);

    let endVals = times.slice(sIdx+1, eIdx+1);
    let afterEnd = times.slice(eIdx+1);

    return { startVals, endVals, beforeStart, afterEnd };
}

function timeOverlap(startA, endA, startB, endB) {
    startA = timeStrToMin(startA);
    startB = timeStrToMin(startB);
    endA = timeStrToMin(endA);
    endB = timeStrToMin(endB);
    return (startA >= startB && startA < endB)
        || (endA <= endB && endA > startB)
        || (startA < startB && endA > endB);
}

function getTimeOverlapFilters(settings, rsv) {
    let owAmStart = settings.get('openwaterAmStartTime', rsv.date);
    let owAmEnd = settings.get('openwaterAmEndTime', rsv.date);
    let owPmStart = settings.get('openwaterPmStartTime', rsv.date);
    let owPmEnd = settings.get('openwaterPmEndTime', rsv.date);
    let start, end;
    let owTimes = [];
    if (['pool', 'classroom'].includes(rsv.category)) {
        start = rsv.startTime;
        end = rsv.endTime;
        if (timeOverlap(start, end, owAmStart, owAmEnd)) {
            owTimes.push('AM')
        }
        if (timeOverlap(start, end, owPmStart, owPmEnd)) {
            owTimes.push('PM');
        }
    } else if (rsv.category === 'openwater') {
        owTimes.push(rsv.owTime);
        if (rsv.owTime === 'AM') {
            start = owAmStart;
            end = owAmEnd;
        } else if (rsv.owTime === 'PM') {
            start = owPmStart;
            end = owPmEnd;
        }
    }

    let filters = []

    if (owTimes.length > 0) {
        filters.push(rsv => rsv.category === 'openwater' && owTimes.includes(rsv.owTime))
    }

    let slots = getTimeSlots(settings, rsv.date, 'pool', start, end);
    if (slots != null) {
        let timeFilt = [];
        if (slots.startVals.length > 0) {
            timeFilt.push(rsv => slots.startVals.includes(rsv.startTime))
        }
        if (slots.endVals.length > 0) {
            timeFilt.push(rsv => slots.endVals.includes(rsv.endTime))
        }
        if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
            timeFilt.push(rsv =>
                   slots.beforeStart.includes(rsv.startTime)
                && slots.afterEnd.includes(rsv.endTime)
            );
        }
        filters.push(rsv =>
               ['pool', 'classroom'].includes(rsv.category)
            && timeFilt.reduce((b, f) => b || f(rsv), false)
        );
    }
    return filters;
}

export function getOverlappingReservations(settings, sub, rsvs) {
    let filters = rsv => {
        return rsv.date === sub.date
            && ['pending', 'confirmed'].includes(rsv.status)
            && getTimeOverlapFilters(settings, sub)
                .reduce((b,f) => b || f(rsv), false);
    };

    return rsvs.filter(rsv => filters(rsv));
}

export const nOccupants = (rsvs, maxOccPerLane) => rsvs.reduce((n, rsv) => {
    if (rsv.category === 'classroom') {
        return n + rsv.numStudents;
    } else {
        return rsv.resType === 'course'
            ? n + 2*Math.ceil(rsv.numStudents/maxOccPerLane)
            : n + 1;
    }
}, 0);

function checkPoolSpaceAvailable(sub, rsvs, settings) {
    let startTs = startTimes(settings, sub.date, sub.category);
    for (let i=startTs.indexOf(sub.startTime); i < startTs.indexOf(sub.endTime); i++) {
        let time = timeStrToMin(startTs[i]);
        let overlap = rsvs.filter(rsv => {
            let start = timeStrToMin(rsv.startTime);
            let end = timeStrToMin(rsv.endTime);
            let notMe = sub.id != rsv.id;
            let notMyBuddy = !sub.buddies.includes(rsv.user.id);
            return notMe && notMyBuddy && start <= time && end > time;
        });
        let mpl = settings.get('maxOccupantsPerLane', sub.date);
        let numDivers = nOccupants([sub], mpl)
            + sub.buddies.length
            + nOccupants(overlap, mpl);
        let nLanes = settings.get('poolLanes', sub.date).length;
        if (numDivers > nLanes*mpl) {
            return false;
        }
    }
    return true;
}

function simulateDiveGroup(sub, existing) {
    // remove current user and buddies in case this is a modification
    // to an existing reservation
    existing = existing.filter(rsv => {
        return rsv.user.id !== sub.id && !sub.buddies.includes(rsv.user.id);
    });

    // add fields that db normally adds to this submission and its buddies
    let owner = {...sub};
    let simId = -1;
    owner.buoy = 'auto';
    owner.id = simId--;
    owner.user = {id: owner.user};
    let simBuds = [];
    for (let id of owner.buddies) {
        let buddies = [owner.user.id, ...owner.buddies.filter(thisId => thisId != id)];
        simBuds.push({
            ...owner,
            id: simId--,
            user: {id},
            buddies,
        });
    }
    return [owner, ...simBuds, ...existing];
}

export function checkSpaceAvailable(settings, buoys, sub, existing) {
    let overlapping = getOverlappingReservations(settings, sub, existing)
        .filter(rsv => rsv.category === sub.category);
    if (sub.category === 'openwater') {
        let diveGroup = simulateDiveGroup(sub, overlapping);
        let result = assignRsvsToBuoys(buoys, diveGroup);
        if (result.status === 'error') {
            return {
                status: 'error',
                message: 'All buoys are fully booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        } else {
            return result;
        }
    } else if (sub.category === 'pool') {
        if (checkPoolSpaceAvailable(sub, overlapping, settings)) {
            return { status: 'success' };
        } else {
            return {
                status: 'error',
                message: 'All pool lanes are booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        }
    } else if (sub.category === 'classroom') {
        overlapping = overlapping.filter(rsv => rsv.user.id != sub.user);
        if (overlapping.length >= settings.get('classrooms', sub.date).length) {
            return {
                status: 'error',
                message: 'All classrooms are booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        } else {
            return { status: 'success' };
        }
    }
}

export function buddysRsv(rsv, sub) {
    if (sub.buddies && sub.buddies.includes(rsv.user.id)) {
        if (['pool', 'classroom'].includes(sub.category)) {
            return rsv.category === sub.category
                && rsv.startTime === sub.startTime
                && rsv.endTime === sub.endTime;
        } else if (sub.category === 'openwater') {
            return rsv.category === sub.category
                && rsv.owTime === sub.owTime;
        } else {
            throw new Error();
        }
    } else {
        return false;
    }
}

export function checkNoOverlappingRsvs(settings, sub, existing) {
    let userIds = [sub.user, ...sub.buddies];
    let overlapping = getOverlappingReservations(settings, sub, existing);
    for (let rsv of overlapping) {
        if (rsv.id != sub.id && !buddysRsv(rsv, sub) && userIds.includes(rsv.user.id)) {
            return {
                status: 'error',
                msg: 'Your or one of your buddies has an existing reservation at this time'
            };
        }
    }
    return { status: 'success' };
}

export function validateBuddies(rsv) {
    let userIds = Object.keys(get(users));
    let validBuddies = [];
    for (let buddy of rsv.buddies) {
       if (rsv.user.id === buddy) {
            return {status: 'error', msg: 'Cannot add yourself as a buddy'};
        }
        if (!userIds.includes(buddy)) {
            return {status: 'error', msg: 'Unknown user in buddy field'};
        }
        if (validBuddies.includes(buddy)) {
            return {status: 'error', msg: 'Duplicate buddies not allowed'};
        }
        validBuddies.push(buddy);
    }
    return {status: 'success'};
}
