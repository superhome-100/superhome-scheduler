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
                    if (rsv.date === dateStr) {
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
            startTime = Settings('openwater_AM_startTime', rsv.date);
            endTime = Settings('openwater_AM_endTime', rsv.date);
        } else if (rsv.owTime === 'PM') {
            startTime = Settings('openwater_PM_startTime', rsv.date);
            endTime = Settings('openwater_PM_endTime', rsv.date);
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

function overlap(rsvA, rsvB) {
    let startA = timeStrToMin(rsvA.startTime);
    let endA = timeStrToMin(rsvA.endTime);
    let startB = timeStrToMin(rsvB.startTime);
    let endB = timeStrToMin(rsvB.endTime);

    return (startA >= startB && startA < endB)
            || ((endA <= endB && endA > startB)
                || (startA < startB && startA > endB));
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
                && overlap(thisRsv, rsv)) {
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
        let numDivers = existingRsvs.reduce((acc, rsv) => {
            acc += rsv.resType === 'course' ? 2 : 1;
            return acc;
        }, 0);

        if (numDivers >= 8) {
            return {
                status: 'error',
                message: 'All pool lanes are booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        } else {
            return { status: 'success' };
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

function assignUpToSoftCapacity(rsvs, dateStr, softCapacity, sameResource) {
    let schedule = Array(softCapacity).fill();
    let incT = inc(dateStr);
    let count = 0;
    while (rsvs.length > 0 && count < softCapacity) {
        let nextTime = timeStrToMin(startTimes(dateStr)[0]);
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
                    rsvs.splice(j,1);
                    for (let i=0; i<rsvs.length; i++) {
                        let cand = rsvs[i];
                        if (rsv.buddies.includes(cand.user.id)) {
                            block.data.push(cand);
                            rsvs.splice(i,1);
                            j--;
                            break;
                        }
                    }
                    thisR.push(block);
                }
            }
        }

        let end = timeStrToMin(endTimes(dateStr)[endTimes(dateStr).length-1]);
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

    let incT = inc(dateStr);
    let nextR = 0;

    while (rsvs.length > 0) {

        let rsv = rsvs[0];
        let start = timeStrToMin(rsv.startTime);
        let end = timeStrToMin(rsv.endTime)

        nextR = (nextR + 1) % softCapacity;
        let resource = schedule[nextR];

        for (let j=0; j < resource.length; j++) {
            let block = resource[j];
            let blockCls = block.cls;
            let nRsv = block.data.length;
            if (block.resType != 'course'
                && block.data.length < 2    // in case buddy has already been paired
                && sameResource(nextR, rsv)
                && start >= block.start
                && start < block.end
            ) {
                if (start > block.start) {
                    // break off beginning of existing block into its own block
                    let begBlock = {...block};
                    begBlock.end = start;
                    begBlock.nSlots = (start - block.start) / incT;
                    begBlock.cls = blockCls;
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
                        endBlock.cls = blockCls;
                        endBlock.data = endBlock.data.slice(0,nRsv);
                        resource.splice(j+1, 0, endBlock);
                        j++;

                        block.end = end;
                        block.nSlots = (end - block.start) / incT;
                    }

                    // rsv has now been fully added, remove from list
                    rsvs.splice(0, 1);
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
    rsvs = rsvs.filter((v) => v.category === category && v.date === today);
    rsvs.sort((a,b) => timeStrToMin(a.startTime) < timeStrToMin(b.startTime) ? 1 : -1);

    let sameResource;
    if (category === 'pool') {
        sameResource = (idx, rsv) => rsv.pool_lane == null || rsv.pool_lane == idx+1;
    } else if (category === 'classroom') {
        sameResource = (idx, rsv) => rsv.room == null || rsv.room == (2-idx)+1;
    }

    let schedule = assignUpToSoftCapacity(rsvs, today, softCapacity, sameResource);

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
        if (['refreshIntervalSeconds'].includes(name)) {
            v = parseInt(v);
        }
        if (name === 'refreshIntervalSeconds') {
            name = 'refreshInterval'
            v = v*1000;
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


