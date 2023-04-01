import {
    dateStrParseDate,
    datetimeToLocalDateStr,
    timeGE,
    timeLT,
    timeStrToMin
} from './datetimeUtils.js';
import { reservations, users, buoys } from './stores.js'
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
    if (rsv.category === 'openwater') {
        if (rsv.owTime === 'AM') {
            startTime = '9:00';
            endTime = '11:00';
        } else if (rsv.owTime === 'PM') {
            startTime = '14:00';
            endTime = '16:00';
        }
    }

    let newRsv = {
        ...rsv,
        startTime,
        endTime,
        dateObj: dateStrParseDate(rsv.date)
    };

    if (fbId) { newRsv.user['facebookId'] = fbId }
    if (name) { newRsv.user['name'] = name }

    return newRsv;
}

export function convertReservationTypes(data) {
    if ('maxDepth' in data) {
        data.maxDepth = parseInt(data.maxDepth);
    }
    if ('numStudents' in data) {
        data.numStudents = parseInt(data.numStudents);
    }
    if ('buddies' in data) {
        data.buddies = JSON.parse(data.buddies);
    }
    return data;
}

function getExistingRsvs(thisRsv) {
    if (thisRsv.category === 'openwater') {
        return get(reservations).filter((rsv) => {
            if (rsv.category === 'openwater'
                && rsv.date === thisRsv.date
                && rsv.owTime === thisRsv.owTime) {
                return true;
            } else {
                return false;
            }
        });
    } else if (['pool', 'classroom'].includes(thisRsv.category)) {
        const thisStart = timeStrToMin(thisRsv.startTime);
        const thisEnd = timeStrToMin(thisRsv.endTime);
        const overlap = (rsv) => {
            let start = timeStrToMin(rsv.startTime);
            let end = timeStrToMin(rsv.endTime);
            return ((thisStart >= start && thisStart < end)
                || (thisEnd <= end && thisEnd > start)
                || (thisStart < start && thisEnd > end));
        };
        return get(reservations).filter((rsv) => {
            if (rsv.category === thisRsv.category
                && rsv.date === thisRsv.date
                && overlap(rsv)) {
                return true;
            } else {
                return false;
            }
        });
    }
}

export function checkDuplicateRsv(thisRsv) {
    let existingRsvs = getExistingRsvs(thisRsv);
    return existingRsvs.filter((rsv) => thisRsv.user === rsv.user.id).length > 0;
}

export function checkSpaceAvailable(thisRsv) {
    let existingRsvs = getExistingRsvs(thisRsv);
    if (thisRsv.category === 'openwater') {
        let result = assignRsvsToBuoys(get(buoys), [...existingRsvs, thisRsv]);
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
        // to do: implement the actual pool rules
        if (existingRsvs.length >= 6) {
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

export function validateBuddies(formData) {
    let user = formData.get('user')
    let userIds = get(users).map((r) => r.id);
    let buddies = JSON.parse(formData.get('buddies')).id;
    let validBuddies = [];
    for (let buddy of buddies) {
        if (user === buddy) {
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
    let buddies = {'name': [], 'id': []};
    for (let i=0; i < numBuddies; i++) {
        buddies.name.push(formData.get('buddy' + i));
        buddies.id.push(formData.get('buddy' + i + '_id'));
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

export function getDaySchedule(startTimes, rsvs, datetime, category, nResource) {
    let schedule = [];
    let today = datetimeToLocalDateStr(datetime);
    rsvs = rsvs.filter((v) => v.category === category && v.date === today);

    for (let t of startTimes) {
        let timeRsvs = Array(nResource).fill().map(() => []);
        let resource = 0;
        for (let rsv of rsvs) {
            if (timeGE(t, rsv.startTime)
                && timeLT(t, rsv.endTime))
            {
                timeRsvs[resource].push(displayTag(rsv));
                resource = (resource + 1) % nResource;
            }
        }
        schedule.push({start: t, rsvs: timeRsvs});
    }
    return schedule;
}

export function removeRsv(rsv) {
    let rsvs = get(reservations);
    for (let i=0; i < rsvs.length; i++) {
        if (rsv.id === rsvs[i].id) {
            rsvs.splice(i,1);
            reservations.set(rsvs);
            break;
        }
    }
}

export function parseSettingsTbl(settingsTbl) {
    let settings = {}

    for (let s of settingsTbl) {
        let name = s.name;
        let v = s.value;
        if (['refreshIntervalSeconds'].includes(name)) {
            v = parseInt(v);
        } else if (['poolLanes', 'classrooms'].includes(name)) {
            v = v.split(';');
        }
        if (name === 'refreshIntervalSeconds') {
            name = 'refreshInterval'
            v = v*1000;
        }
        settings[name] = v;
    }
    return settings;
}
