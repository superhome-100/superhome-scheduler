import { startTimes, inc } from './ReservationTimes.js';
import { datetimeToLocalDateStr, timeStrToMin } from './datetimeUtils.js';
import { reservations, user, users, viewMode } from './stores.js'
import { Settings } from './settings.js';
import { get } from 'svelte/store';
import { assignRsvsToBuoys } from './autoAssignOpenWater.js';
import { assignSpaces, patchSchedule } from './autoAssignPool.js';

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

export function augmentRsv(rsv, user=null) {
    let startTime = rsv.startTime;
    let endTime = rsv.endTime;
    let categoryPretty = rsv.category.charAt(0).toUpperCase() + rsv.category.slice(1);
    if (rsv.buddies == null) {
        rsv.buddies = [];
    }
    if (rsv.category === 'openwater') {
        if (rsv.owTime === 'AM') {
            startTime = Settings.get('openwaterAmStartTime', rsv.date);
            endTime = Settings.get('openwaterAmEndTime', rsv.date);
        } else if (rsv.owTime === 'PM') {
            startTime = Settings.get('openwaterPmStartTime', rsv.date);
            endTime = Settings.get('openwaterPmEndTime', rsv.date);
        }
    }
    let newRsv = {
        ...rsv,
        categoryPretty,
        startTime,
        endTime,
    };

    if (user) {
        newRsv.user = {
            id: user.id,
            facebookId: user.facebookId,
            name: user.name,
            nickname: user.nickname,
        };
    }

    return newRsv;
}

export function convertReservationTypes(data) {
    if ('maxDepth' in data) {
        data.maxDepth = parseInt(data.maxDepth);
    }
    if (data.category === 'openwater') {
        for (let opt of ['O2OnBuoy', 'extraBottomWeight', 'bottomPlate', 'largeBuoy']) {
            data[opt] = data[opt] === 'on';
        }
        // preserve whether or not user indicated a pulley preference
        data.pulley = data.pulley === undefined ? null : data.pulley === 'on';
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

export function timeOverlap(startA, endA, startB, endB) {
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

export const nOccupants = (rsvs, maxOccPerLane) => rsvs.reduce((n, rsv) => {
    if (rsv.category === 'classroom') {
        return n + rsv.numStudents;
    } else {
        return rsv.resType === 'course'
            ? n + 2*Math.ceil(rsv.numStudents/maxOccPerLane)
            : n + 1;
    }
}, 0);

function checkPoolSpaceAvailable(thisRsv, rsvs, settings) {
    let startTs = startTimes(settings, thisRsv.date, thisRsv.category);
    for (let i=startTs.indexOf(thisRsv.startTime); i < startTs.indexOf(thisRsv.endTime); i++) {
        let time = timeStrToMin(startTs[i]);
        let overlap = rsvs.filter(rsv => {
            let start = timeStrToMin(rsv.startTime);
            let end = timeStrToMin(rsv.endTime);
            let notMe = thisRsv.id != rsv.id;
            let notMyBuddy = !thisRsv.buddies.includes(rsv.user.id);
            return notMe && notMyBuddy && start <= time && end > time;
        });
        let mpl = settings.get('maxOccupantsPerLane', thisRsv.date);
        let numDivers = nOccupants([thisRsv], mpl)
            + thisRsv.buddies.length
            + nOccupants(overlap, mpl);
        let nLanes = settings.get('poolLanes', thisRsv.date).length;
        if (numDivers > nLanes*mpl) {
            return false;
        }
    }
    return true;
}

function simulateOWBuddies(rsv, existing) {
    let owner = {...rsv};
    let simId = -1;
    owner.buoy = 'auto';
    owner.id = simId--;
    owner.user = {id: owner.user};
    let simBuds = [];
    for (let id of rsv.buddies) {
        if (existing.filter(rsv => rsv.user.id === id).length == 0) {
            let buddies = [owner.user.id, ...owner.buddies.filter(thisId => thisId != id)];
            simBuds.push({
                ...owner,
                id: simId--,
                user: {id},
                buddies,
            });
        }
    }
    return [owner, ...simBuds];
}

export function checkSpaceAvailable(settings, buoys, thisRsv, rsvs) {
    let existingRsvs = getExistingRsvs(thisRsv, rsvs);
    if (thisRsv.category === 'openwater') {
        let [owner, ...buddies] = simulateOWBuddies(thisRsv, existingRsvs);
        let result = assignRsvsToBuoys(buoys, [...existingRsvs, ...buddies, owner]);
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
        if (checkPoolSpaceAvailable(thisRsv, existingRsvs, settings)) {
            return { status: 'success' };
        } else {
            return {
                status: 'error',
                message: 'All pool lanes are booked at this time.  ' +
                         'Please either check back later or try a different date/time'
            };
        }
    } else if (thisRsv.category === 'classroom') {
        if (existingRsvs.length >= settings.get('classrooms', thisRsv.date).length) {
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
            return {status: 'error', msg: 'Unknown user in buddy field'};
        }
        if (validBuddies.includes(buddy)) {
            return {status: 'error', msg: `Duplicate buddies not allowed (${buddy})`};
        }
        validBuddies.push(buddy);
    }
    return {status: 'success'};
}

export function updateReservationFormData(formData) {
    let resType = formData.get('resType');
    let numBuddies = parseInt(formData.get('numBuddies'));
    formData.delete('numBuddies');
    let buddies = [];
    for (let i=0; i < numBuddies; i++) {
        if (resType === 'autonomous') {
            let name = formData.get('buddy' + i);
            if (name !== '') {
                buddies.push(formData.get('buddy' + i + '_id'));
            }
        }
        formData.delete('buddy' + i);
        formData.delete('buddy' + i + '_id');
    }
    formData.set('buddies', JSON.stringify(buddies));
}

export const displayTag = (rsv) => {
    let tag = rsv.user.nickname;
    if (rsv.resType === 'course') {
        tag += ' +' + rsv.numStudents;
    }
    if (rsv.category === 'openwater') {
        tag += ' - ' + rsv.maxDepth + 'm';
    }
    return tag;
};

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
        if ([
                'maxOccupantsPerLane',
                'refreshIntervalSeconds',
                'reservationLeadTimeDays'
            ].includes(name)
        ) {
            v = parseInt(v);
        }
        if (name === 'refreshIntervalSeconds') {
            name = 'refreshInterval'
            v = v*1000;
        }
        if ([
                'openForBusiness',
                'poolBookable',
                'classroomBookable',
                'openwaterAmBookable',
                'openwaterPmBookable'
            ].includes(name)
        ) {
            v = v === 'true';
        }
        if (['poolLanes', 'classrooms', 'boats', 'captains'].includes(name)) {
            v = v.split(';');
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
        val = Settings.get('poolBookable', sub.date);
        msg = 'Pool';
    } else if (sub.category === 'openwater') {
        if (sub.owTime == 'AM') {
            val = Settings.get('openwaterAmBookable', sub.date);
            msg = 'AM Openwater'
        } else if (sub.owTime == 'PM') {
            val = Settings.get('openwaterPmBookable', sub.date);
            msg = 'PM Openwater'
        }
    } else if (sub.category === 'classroom') {
        val = Settings.get('classroomBookable', sub.date);
        msg = 'Classroom';
    }
    if (val) {
        return { result: true }
    } else {
        return {
            result: false,
            message: msg + ' reservations are not bookable on this date',
        }
    }
}

function assignClassrooms(rsvs, dateStr) {
    let rooms = Settings.get('classrooms', dateStr);
    let schedule = Array(rooms.length).fill().map(() => {
        return [{
            nSlots: 0,
            cls: 'filler',
            data: []
        }];
    });

    let sTs = startTimes(Settings, dateStr, 'classroom');
    let nTimes = sTs.length;
    let minTime = timeStrToMin(sTs[0]);
    let incT = inc(Settings, dateStr);
    let timeIdx = (time) => (timeStrToMin(time)-minTime) / incT;

    rsvs.sort((a,b) => a.room != 'auto' ? -1 : b.room != 'auto' ? 1 : 0);
    rsvs.forEach(rsv => rsv.unassigned = rsv.room === 'auto');

    const lastBlk = (r) => schedule[r][schedule[r].length-1];
    const continuingBlk = (blk, rsv) => blk.cls === 'rsv' && blk.data[0].id === rsv.id;
    const newBlk = (blk, rsv, t) => rsv.unassigned
        && (
            (blk.cls === 'rsv' && blk.end === t)
            || blk.cls === 'filler'
        );

    for (let t=0; t<nTimes; t++) {
        let unassigned = Array(rooms.length).fill().map(()=>true);
        for (let rsv of rsvs) {
            let start = timeIdx(rsv.startTime);
            let end = timeIdx(rsv.endTime);
            if (start <= t && t < end) {
                if (rsv.room !== 'auto') {
                    // pre-assigned
                    let r = rooms.indexOf(rsv.room)
                    let curBlk = lastBlk(r);
                    if (curBlk.cls == 'rsv') {
                        if (curBlk.data[0].id === rsv.id) {
                            curBlk.nSlots++;
                        } else {
                            schedule[r].push({
                                nSlots: 1,
                                cls: 'rsv',
                                data: [rsv]
                            });
                        }
                    } else {
                        schedule[r].push({
                            nSlots: 1,
                            cls: 'rsv',
                            data: [rsv]
                        });
                    }
                    unassigned[r] = false;
                } else {
                    // unassigned
                    for (let r=0; r<rooms.length; r++) {
                        let curBlk = lastBlk(r);
                        if (continuingBlk(curBlk, rsv)) {
                            curBlk.nSlots++;
                            unassigned[r] = false;
                            break;
                        } else if (newBlk(curBlk, rsv, t)) {
                            rsv.unassigned = false;
                            schedule[r].push({
                                start,
                                end,
                                nSlots: 1,
                                cls: 'rsv',
                                data: [rsv]
                            });
                            unassigned[r] = false;
                            break;
                        }
                    }
                }
            }
        }
        for (let r=0; r < unassigned.length; r++) {
            if (unassigned[r]) {
                let curBlk = lastBlk(r);
                if (curBlk.cls == 'filler') {
                    curBlk.nSlots++;
                } else {
                    schedule[r].push({
                        nSlots: 1,
                        cls: 'filler',
                        data: []
                    });
                }
            }
        }
    }
    return {
        status: 'success',
        schedule
    };
}

export function getDaySchedule(rsvs, datetime, category, softCapacity) {
    let today = datetimeToLocalDateStr(datetime);
    rsvs = rsvs.filter((v) =>
        v.status != 'rejected'
        && v.category === category
        && v.date === today
    );
    let result;
    if (category === 'pool') {
        result = assignSpaces(rsvs, today);
        if (result.status === 'success') {
            result.schedule = patchSchedule(result.schedule);
        }
    } else if (category === 'classroom') {
        result = assignClassrooms(rsvs, today);
    }

    return result;
}

export const adminView = (viewOnly) => {
    return get(user).privileges === 'admin'
        && get(viewMode) === 'admin'
        && viewOnly;
};

export const buoyDesc = (buoy) => {
    let desc = '';
    if (buoy.largeBuoy) { desc += 'L' }
    if (buoy.pulley) { desc += 'P' }
    if (buoy.bottomPlate) { desc += 'B' }
    desc += buoy.maxDepth;
    return desc;
}

export const addMissingFields = (submitted, original) => {
    for (let field in original) {
        if (submitted[field] === undefined) {
            submitted[field] = original[field];
        }
    }
};
