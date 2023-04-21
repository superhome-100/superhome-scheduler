import { startTimes, endTimes, inc } from './ReservationTimes.js';
import { datetimeToLocalDateStr, timeStrToMin } from './datetimeUtils.js';
import { reservations, users } from './stores.js'
import { Settings } from './settings.js';
import { get } from 'svelte/store';
import { assignRsvsToBuoys } from './autoAssign.js';

export function monthArr(year, month, reservations) {
    let daysInMonth = new Date(year, month+1, 0).getDate();
    let firstDay = new Date(year, month, 1);
    let startDay = 1 - firstDay.getDay()
    let rows = Math.ceil((firstDay.getDay() + daysInMonth)/7);
    let month_a = Array(rows)
        .fill()
        .map((w,w_i) => Array(7)
            .fill()
            .map(function(d,d_i) {
                let idx = w_i*7 + d_i;
                let date = new Date(year, month, startDay + idx);
                let dateStr = datetimeToLocalDateStr(date);
                let dayRsvs = [];
                for (let rsv of reservations) {
                    if (rsv.date === dateStr && rsv.status != 'rejected') {
                        dayRsvs.push(rsv);
                    }
                }
                return { date, rsvs: dayRsvs };
            })
        );
    return month_a;
};

export function sortUserReservations(newRsvs, id, sorted={'past': [], 'upcoming': []}) {
    let now = datetimeToLocalDateStr(new Date());
    for (let rsv of newRsvs) {
        if (rsv.user.id === id) {
            let view = rsv.date >= now ? 'upcoming' : 'past';
            sorted[view].push(rsv);
        }
    }
    return sorted;
}

export function augmentRsv(rsv, fbId=null, name=null) {
    let startTime = rsv.startTime;
    let endTime = rsv.endTime;
    let categoryPretty = rsv.category.charAt(0).toUpperCase() + rsv.category.slice(1);
    if (rsv.buddies == null) {
        rsv.buddies = [];
    }
    if (rsv.category === 'openwater') {
        if (rsv.owTime === 'AM') {
            startTime = Settings('openwaterAmStartTime', rsv.date);
            endTime = Settings('openwaterAmEndTime', rsv.date);
        } else if (rsv.owTime === 'PM') {
            startTime = Settings('openwaterPmStartTime', rsv.date);
            endTime = Settings('openwaterPmEndTime', rsv.date);
        }
    }
    let newRsv = {
        ...rsv,
        categoryPretty,
        startTime,
        endTime,
    };

    if (fbId) { newRsv.user['facebookId'] = fbId }
    if (name) { newRsv.user['name'] = name }

    return newRsv;
}

export function convertReservationTypes(data) {
    if ('maxDepth' in data) {
        data.maxDepth = parseInt(data.maxDepth);
    }
    if (data.category === 'openwater') {
        for (let opt of ['pulley', 'extraBottomWeight', 'bottomPlate', 'largeBuoy']) {
            data[opt] = data[opt] === 'on';
        }
    }
    if ('numStudents' in data) {
        data.numStudents = parseInt(data.numStudents);
    }
    for (let f of ['buddies', 'oldBuddies', 'delBuddies']) {
        if (f in data) {
            data[f] = JSON.parse(data[f]);
        }
    }
    return data;
}

function timeOverlap(startA, endA, startB, endB) {
    return (startA >= startB && startA < endB)
        || (endA <= endB && endA > startB)
        || (startA < startB && endA > endB);
}

function rsvOverlap(rsvA, rsvB) {
    let startA = timeStrToMin(rsvA.startTime);
    let endA = timeStrToMin(rsvA.endTime);
    let startB = timeStrToMin(rsvB.startTime);
    let endB = timeStrToMin(rsvB.endTime);
    return timeOverlap(startA, endA, startB, endB);
}

function getExistingRsvs(thisRsv, rsvs) {
    if (thisRsv.category === 'openwater') {
        return rsvs.filter((rsv) => {
            if (rsv.id != thisRsv.id
                && rsv.category === 'openwater'
                && rsv.date === thisRsv.date
                && rsv.owTime === thisRsv.owTime) {
                return true;
            } else {
                return false;
            }
        });
    } else if (['pool', 'classroom'].includes(thisRsv.category)) {
        return rsvs.filter((rsv) => {
            if (rsv.id != thisRsv.id
                && rsv.category === thisRsv.category
                && rsv.date === thisRsv.date
                && rsvOverlap(thisRsv, rsv)) {
                return true;
            } else {
                return false;
            }
        });
    }
}

export function checkDuplicateRsv(thisRsv, rsvs) {
    let existingRsvs = getExistingRsvs(thisRsv, rsvs);
    return existingRsvs.filter((rsv) => thisRsv.user === rsv.user.id).length > 0;
}

const nLaneOccupants = (rsvs) => rsvs.reduce((n, rsv) => rsv.resType === 'course'
        ? n + 2*Math.ceil(rsv.numStudents/4)
        : n + 1,
    0);

function checkPoolSpaceAvailable(thisRsv, rsvs) {
    let startTs = startTimes(thisRsv.date, thisRsv.category);
    for (let i=startTs.indexOf(thisRsv.startTime); i < startTs.indexOf(thisRsv.endTime); i++) {
        let time = timeStrToMin(startTs[i]);
        let overlap = rsvs.filter(rsv => {
            let start = timeStrToMin(rsv.startTime);
            let end = timeStrToMin(rsv.endTime);
            let notMe = thisRsv.id != rsv.id;
            let notMyBuddy = !thisRsv.buddies.includes(rsv.user.id);
            return notMe && notMyBuddy && start <= time && end > time;
        });
        let numDivers = nLaneOccupants([thisRsv]) + thisRsv.buddies.length + nLaneOccupants(overlap);
        if (numDivers > 8) {
            return false;
        }
    }
    return true;
}

export function checkSpaceAvailable(thisRsv, rsvs, buoys) {
    let existingRsvs = getExistingRsvs(thisRsv, rsvs);
    if (thisRsv.category === 'openwater') {
        let result = assignRsvsToBuoys(buoys, [...existingRsvs, thisRsv]);
        if (result.status === 'error') {
            return {
                status: 'error',
                message: 'All buoys are fully booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        } else {
            return result;
        }
    } else if (thisRsv.category === 'pool') {
        if (checkPoolSpaceAvailable(thisRsv, existingRsvs)) {
            return { status: 'success' };
        } else {
            return {
                status: 'error',
                message: 'All pool lanes are booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        }
    } else if (thisRsv.category === 'classroom') {
        if (existingRsvs.length >= 3) {
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

export function validateBuddies(rsv) {
    let userIds = Object.keys(get(users));
    let validBuddies = [];
    for (let buddy of rsv.buddies) {
        if (rsv.user.id === buddy) {
            return {status: 'error', msg: 'Cannot add yourself as a buddy'};
        }
        if (!userIds.includes(buddy)) {
            return {status: 'error', msg: `Unknown user: ${buddy}`};
        }
        if (validBuddies.includes(buddy)) {
            return {status: 'error', msg: `Duplicate buddies not allowed (${buddy})`};
        }
        validBuddies.push(buddy);
    }
    return {status: 'success'};
}

export function updateReservationFormData(formData) {
    let numBuddies = parseInt(formData.get('numBuddies'));
    formData.delete('numBuddies');
    let buddies = [];
    for (let i=0; i < numBuddies; i++) {
        buddies.push(formData.get('buddy' + i + '_id'));
        formData.delete('buddy' + i);
        formData.delete('buddy' + i + '_id');
    }
    formData.set('buddies', JSON.stringify(buddies));
}

export const displayTag = (rsv) => {
    let tag = rsv.user.name;
    if (rsv.resType === 'course') {
        tag += ' +' + rsv.numStudents;
    }
    if (rsv.category === 'openwater') {
        tag += ' - ' + rsv.maxDepth + 'm';
    }
    return tag;
};

function assignUpToSoftCapacity(rsvs, category, dateStr, softCapacity, sameResource) {
    const maxStudentsPerLane = 2;
    let schedule = Array(softCapacity).fill();
    let incT = inc(dateStr);
    let count = 0;
    // assign courses first (put them at the end) to ensure they get their own lane
    // then assign buddies next to ensure they are paired in the same lane
    rsvs.sort((a,b) => a.resType === 'course'
        ? 1 : b.resType === 'course'
        ? -1 : a.buddies.length > b.buddies.length
        ? 1 : b.buddies.length > a.buddies.length
        ? -1 : timeStrToMin(a.startTime) > timeStrToMin(b.startTime)
        ? 1 : -1
    );
    // helper hidden var for splitting courses into multiple lanes when necessary
    for (let rsv of rsvs) {
        if (rsv.resType === 'course') {
            rsv.hiddenStudents = rsv.numStudents;
        }
    }
    while (rsvs.length > 0 && count < softCapacity) {
        let nextTime = timeStrToMin(startTimes(dateStr, category)[0]);
        let thisR = [];
        for (let j=rsvs.length-1; j >= 0; j--) {
            let rsv = rsvs[j];
            if (sameResource(count, rsv)) {
                let start = timeStrToMin(rsv.startTime);
                if (start >= nextTime) {
                    if (start > nextTime) {
                        thisR.push({
                            start: nextTime,
                            end: start,
                            nSlots: (start - nextTime) / incT,
                            cls: 'filler',
                            data: [],
                        });
                    }
                    nextTime = timeStrToMin(rsv.endTime);
                    let nSlots = (nextTime - start) / incT;
                    let block = {
                        start,
                        end: nextTime,
                        nSlots,
                        cls: 'rsv',
                        data: [rsv],
                        resType: rsv.resType
                    };
                    // split courses with >maxStudentsPerLane students into multiple lanes
                    if (category === 'pool' && rsv.resType === 'course' && rsv.hiddenStudents > maxStudentsPerLane) {
                        rsv.hiddenStudents -= maxStudentsPerLane;
                        j++;
                    } else {
                        rsvs.splice(j,1);

                        if (rsv.buddies.length > 0) {
                            for (let i=0; i<rsvs.length; i++) {
                                let cand = rsvs[i];
                                if (rsv.buddies.includes(cand.user.id)) {
                                    block.data.push(cand);
                                    rsvs.splice(i,1);
                                    j--;
                                    break;
                                }
                            }
                        }
                    }
                    thisR.push(block);
                }
            }
        }

        let end = timeStrToMin(endTimes(dateStr, category)[endTimes(dateStr, category).length-1]);
        if (nextTime < end) {
            thisR.push({
                start: nextTime,
                end: end,
                nSlots: (end-nextTime) / incT,
                cls: 'filler',
                data: [],
            });
        }
        schedule[count] = thisR;
        count++;
    }
    return schedule;
}

function assignOverflowCapacity(rsvs, schedule, dateStr, softCapacity, sameResource) {

    const bestLane = (rsv) => {
        let start = timeStrToMin(rsv.startTime);
        let end = timeStrToMin(rsv.endTime);
        for (let resource of schedule) {
            let ideal = true;
            for (let block of resource.filter(blk => blk.cls === 'rsv')) {
                if (
                    timeOverlap(start, end, block.start, block.end)
                    && nLaneOccupants(block.data) >= 2
                ) {
                    ideal = false;
                    break;
                };
            }
            if (ideal) { return resource; }
        }
        nextR = (nextR + 1) % softCapacity;
        return schedule[nextR];
    };

    let incT = inc(dateStr);
    let nextR = -1;
    let nextRsv = true;
    let start;

    while (rsvs.length > 0) {
        let rsv = rsvs[0];
        let end = timeStrToMin(rsv.endTime)

        if (nextRsv) {
            start = timeStrToMin(rsv.startTime);
            nextRsv = false;
        }

        let resource = bestLane(rsv);

        for (let j=0; j < resource.length; j++) {
            let block = resource[j];
            let blockClass = block.cls;
            let nRsv = block.data.length;
            if (block.resType != 'course'
                && nRsv < 2    // in case buddy has already been paired
                && sameResource(nextR, rsv)
                && start >= block.start
                && start < block.end
            ) {
                if (start > block.start) {
                    // break off beginning of existing block into its own block
                    let begBlock = {...block};
                    begBlock.end = start;
                    begBlock.nSlots = (start - block.start) / incT;
                    begBlock.cls = blockClass;
                    begBlock.data = [...block.data];
                    resource.splice(j, 0, begBlock);
                    j++;
                }

                block.start = start;
                block.nSlots = (block.end - start) / incT;
                block.cls = 'rsv';
                block.data.push(rsv);

                if (end <= block.end) {
                    if (end < block.end) {
                        // break off end of existing block into its own block
                        let endBlock = {...block};
                        endBlock.start = end;
                        endBlock.nSlots = (block.end - end) / incT;
                        endBlock.cls = blockClass;
                        endBlock.data = endBlock.data.slice(0,nRsv);
                        resource.splice(j+1, 0, endBlock);
                        j++;

                        block.end = end;
                        block.nSlots = (end - block.start) / incT;
                    }

                    // rsv has now been fully added, remove from list
                    rsvs.splice(0, 1);
                    nextRsv = true;
                    break;

                } else {
                    start = block.end;
                }
            }
        }
    }
}

export function getDaySchedule(rsvs, datetime, category, softCapacity) {

    let today = datetimeToLocalDateStr(datetime);
    rsvs = rsvs.filter((v) => v.status != 'rejected' && v.category === category && v.date === today);
    rsvs.sort((a,b) => timeStrToMin(a.startTime) < timeStrToMin(b.startTime) ? 1 : -1);

    let sameResource;
    if (category === 'pool') {
        sameResource = (idx, rsv) => rsv.pool_lane == null || rsv.pool_lane == idx+1;
    } else if (category === 'classroom') {
        sameResource = (idx, rsv) => rsv.room == null || rsv.room == (2-idx)+1;
    }

    let schedule = assignUpToSoftCapacity(rsvs, category, today, softCapacity, sameResource);

    if (category === 'classroom') {
        // we prioritize assigning to classroom 3, then 2, then 1 if necessary
        schedule.reverse();
    }

    assignOverflowCapacity(rsvs, schedule, today, softCapacity, sameResource);

    return schedule;
}

export function removeRsv(id) {
    let rsvs = get(reservations);
    for (let i=0; i < rsvs.length; i++) {
        if (id === rsvs[i].id) {
            rsvs.splice(i,1);
            reservations.set(rsvs);
            break;
        }
    }
}

export function parseSettingsTbl(settingsTbl) {
    let settings = {}
    let fields = new Set(settingsTbl.map((e) => e.name));

    let fixTypes = (e) => {
        let name = e.name;
        let v = e.value;
        if (['refreshIntervalSeconds', 'reservationLeadTimeDays'].includes(name)) {
            v = parseInt(v);
        }
        if (name === 'refreshIntervalSeconds') {
            name = 'refreshInterval'
            v = v*1000;
        }
        if (['openForBusiness', 'poolBookable', 'classroomBookable', 'openwaterAmBookable', 'openwaterPmBookable'].includes(name)) {
            v = v === 'true' ? true : false;
        }

        return {
            ...e,
            name,
            value: v
        };
    };

    fields.forEach(field => {
        let entries = settingsTbl
            .filter(e => e.name === field)
            .map(e => fixTypes(e));
        let def = entries.splice(entries.findIndex(e => e.startDate === 'default'), 1)[0];
        settings[def.name] = {
            default: def.value,
            entries
        };
    });
    return settings;
}

export const badgeColor = (rsvs) => {
    let approved = rsvs.reduce((sts,rsv) => sts && rsv.status === 'confirmed', true);
    return approved ? 'bg-[#00FF00]' : 'bg-[#FFFF00]';
};

export function categoryIsBookable(sub) {
    let val;
    let msg;
    if (sub.category === 'pool') {
        val = Settings('poolBookable', sub.date);
        msg = 'Pool ';
    } else if (sub.category === 'openwater') {
        if (sub.owTime == 'AM') {
            val = Settings('openwaterAmBookable', sub.date);
            msg = 'AM Openwater '
        } else if (sub.owTime == 'PM') {
            val = Settings('openwaterPmBookable', sub.date);
            msg = 'PM Openwater '
        }
    } else if (sub.category === 'classroom') {
        val = Settings('classroomBookable', sub.date);
        msg = 'Classroom ';
    }
    if (val) {
        return { result: true }
    } else {
        return {
            result: false,
            message: msg + 'reservations are not bookable on this date',
        }
    }
}


