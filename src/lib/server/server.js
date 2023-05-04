import { getXataClient, getXataBranch } from '$lib/server/xata.js';
import { checkSpaceAvailable, convertReservationTypes } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { startTimes, endTimes } from '$lib/ReservationTimes.js';
import { timeStrToMin } from '$lib/datetimeUtils.js';
import { Settings } from '$lib/server/settings.js';

const xata = getXataClient();

export async function getTableCsv(table, branch) {
    let client = getXataBranch(branch);
    let fields = ['user.name', 'user.nickname', 'date', 'category', 'status',
        'resType', 'numStudents', 'owTime', 'startTime', 'endTime'];
    let records = await client.db[table]
        .select(fields)
        .getAll();
    let csv = fields.reduce((h,v) => h + ',' + v) + '\n';
    for (let rec of records) {
        csv += fields
            .reduce((vs,f) => vs.push(f.split('.').reduce((o,k) => o[k], rec)) && vs, [])
            .reduce((l, v) => v == null ? l + ',' : l + ',' + v) + '\n';
    }
    return csv;
}

export async function getSettings() {
    let settingsTbl = await xata.db.Settings.getAll();
    let buoys = await xata.db.Buoys.getAll();
    return { settingsTbl, buoys };
}

export async function getSession(id) {
    let records = await xata.db.Sessions
        .select(['*', 'user.privileges', 'user.facebookId', 'user.name', 'user.nickname'])
        .filter({id: id})
        .getMany();
    return records[0];
}

export async function deleteSession(id) {
    return await xata.db.Sessions.delete(id);
}

export async function createSession(user) {
    return await xata.db.Sessions.create({
        'user': user.id,
    });
}

export async function getUser(id) {
    return await xata.db.Users.read(id);
}

export async function getReservationsSince(minDateStr) {
    let reservations = await xata.db.Reservations
        .select(["*", "user.facebookId", "user.name", 'user.nickname'])
        .filter({ date: { $ge: minDateStr }})
        .sort("date", "asc")
        .getAll();

    return reservations;
}

export async function getActiveUsers() {
    let users = await xata.db.Users
        .filter({ status: "active" })
        .getAll();

    return users;
}

export async function getUserReservations(userId) {
    let reservations = await xata.db.Reservations
        .filter({
            "user.facebookId": userId})
        .sort("date", "asc")
        .getAll();

    return reservations;
}

export async function addUser(userId, userName) {
    const record = await xata.db.Users.create({
        "facebookId": userId,
        "name": userName,
        "nickname": userName,
        "status": "active"
    });
    return record;
}

export async function updateNickname(userId, nickname) {
    const record = await xata.db.Users.update(userId, {nickname});
    return record;
}

export async function authenticateUser(userId, userName) {
    let record;
    let records = await xata.db.Users
        .filter({ "facebookId" : userId })
        .getMany({pagination: {size: 1}});
    if (records.length == 0) {
        /* user does not exist yet */
        record = await addUser(userId, userName);
    } else {
        record = records[0];
    }
    return record;
}

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
        filters.push({
            category: 'openwater',
            owTime: { $any: owTimes },
        });
    }

    let slots = getTimeSlots(Settings, rsv.date, 'pool', start, end);
    if (slots != null) {
        let timeFilt = [];
        if (slots.startVals.length > 0) {
            timeFilt.push({ startTime: { $any: slots.startVals }});
        }
        if (slots.endVals.length > 0) {
            timeFilt.push({ endTime: { $any: slots.endVals }});
        }
        if (slots.beforeStart.length > 0 && slots.afterEnd.length > 0) {
            timeFilt.push({ $all: [
                { startTime: { $any: slots.beforeStart }},
                { endTime: { $any: slots.afterEnd }},
            ]});
        }
        filters.push({
            category: { $any: ['pool', 'classroom'] },
            $any: timeFilt,
        });
    }
    return filters;
}

async function getOverlappingReservations(sub, buddies) {
    await Settings.init();
    let filters = {
        date: sub.date,
        user: { $any : buddies },
        $any: getTimeOverlapFilters(Settings, sub),
    };
    let existing = await xata.db.Reservations.filter(filters).getAll();
    return existing;
}

async function getExistingRsvs(entries) {
    let ids = entries.filter(o => o.id).map(o => { return {id:o.id}});
    let filters = {
        date: entries[0].date,
        category: entries[0].category,
    };
    if (ids.length > 0) {
        filters.$not = { $any: ids };
    }

    return await xata.db.Reservations.filter(filters).getAll();
}

async function querySpaceAvailable(entries, remove=[]) {
    let existing = await getExistingRsvs([...entries, ...remove]);
    let buoys;
    let [sub, ...buddies] = entries;
    if (sub.category === 'openwater') {
        buoys = await xata.db.Buoys.getAll();
    }
    await Settings.init();
    let result = checkSpaceAvailable(Settings, buoys, sub, existing);
    if (result.status === 'error') {
        return {
            status: 'error',
            code: 'NO_SPACE_AVAILABLE',
            message: result.message,
        };
    } else {
        return {
            status: 'success'
        }
    }
}

export async function submitReservation(formData) {
    let sub = convertReservationTypes(Object.fromEntries(formData));

    let checkExisting = [sub.user, ...sub.buddies];
    let existing = await getOverlappingReservations(sub, checkExisting);
    if (existing.length > 0) {
        return {
            status: 'error',
            code: 'RSV_EXISTS'
        };
    }

    // openwater bookings require the admin to manually confirm
    sub.status = sub.category === 'openwater' ? 'pending' : 'confirmed';

    // since lanes is of type 'multiple' in the db, it cant have a
    // default value, so we set the default here
    sub.lanes = ['auto'];

    let entries = [sub];
    if (sub.buddies.length > 0) {
        let { user, buddies, ...common } = sub;
        for (let id of buddies) {
            let bg = [user, ...buddies.filter(bid => bid != id)]
            entries.push({...common, user: id, buddies: bg, owner: false});
        }
    }
    let result = await querySpaceAvailable(entries);
    if (result.status === 'error') {
        return result;
    }

    let records = await xata.db.Reservations.create(entries);
    return {
        status: 'success',
        records
    };
}

function buddysRsv(rsv, sub) {
    if (sub.buddies.includes(rsv.user.id)) {
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

export async function updateReservation(formData) {
    let {oldBuddies, ...sub} = convertReservationTypes(Object.fromEntries(formData));
    oldBuddies = oldBuddies ? oldBuddies : [];

    let orig = await xata.db.Reservations.read(sub.id);

    // first check that the owner and associated buddies do not have existing
    // reservations that will overlap with the updated reservation
    let checkExisting = [sub.user, ...sub.buddies];
    let existing = await getOverlappingReservations(sub, checkExisting);
    if (existing.length > 0) {
        for (let rsv of existing) {
            if (rsv.id !== orig.id && !buddysRsv(rsv, orig)) {
                return {
                    status: 'error',
                   code: 'RSV_EXISTS'
                };
            }
        }
    }

    sub.status = sub.category === 'classroom' ? 'confirmed' : 'pending';

    let buddySet = new Set(sub.buddies);
    for (let id of oldBuddies) {
        buddySet.add(id);
    }

    let modify = [sub];
    let create = [];
    let remove = [];

    if (buddySet.size > 0) {
        let existingBuddies;
        let { user, buddies, id, ...common } = sub;
        if (oldBuddies.length > 0) {
            existingBuddies = await getOverlappingReservations(orig, oldBuddies);
        }

        for (let bId of buddySet) {
            if (buddies.includes(bId) && oldBuddies.includes(bId)) {
                // modify
                let rsvId = existingBuddies.filter(rsv => rsv.user.id === bId)[0].id;
                let bg = [user, ...buddies.filter(bIdp => bIdp != bId)]
                let entry = {
                    ...common,
                    id: rsvId,
                    user: bId,
                    buddies: bg,
                    owner: false,
                };
                modify.push(entry);
            } else if (buddies.includes(bId)) {
                // create
                let bg = [user, ...buddies.filter(bIdp => bIdp != bId)]
                let entry = {
                    ...common,
                    user: bId,
                    buddies: bg,
                    owner: false,
                };
                create.push(entry);
            } else {
                // cancel
                let rsvId = existingBuddies.filter(rsv => rsv.user.id === bId)[0].id;
                remove.push(rsvId);
            }
        }
    }

    let result = await querySpaceAvailable([...modify, ...create], remove);
    if (result.status === 'error') { return result; }

    let records = {
        'created': [],
        'canceled': []
    };

    let modrecs = await xata.db.Reservations.update(modify);
    records.modified = modrecs;
    if (create.length > 0) {
        let createrecs = await xata.db.Reservations.create(create);
        records.created = createrecs;
    }
    if (remove.length > 0) {
        let cancelrecs = await xata.db.Reservations.delete(remove);
        records.canceled = cancelrecs;
    }
    return {
        status: 'success',
        records
    };
}

export async function adminUpdate(formData) {
    let rsv = {};
    let id = formData.get('id');
    rsv.status = formData.get('status');

    const cat = formData.get('category');
    if (cat === 'pool') {
        rsv.lanes = [formData.get('lane1')];
        if (formData.has('lane2')) {
            rsv.lanes[1] = formData.get('lane2');
        }
    } else if (cat === 'openwater') {
        rsv.buoy = formData.get('buoy');
    } else if (cat === 'classroom') {
        rsv.room = formData.get('room');
    }

    let record = await xata.db.Reservations.update(id, rsv);
    return {
        status: 'success',
        record
    };
}

export async function cancelReservation(formData) {
    let data = convertReservationTypes(Object.fromEntries(formData));

    let save = data.buddies.filter(id => !data.delBuddies.includes(id));
    let remove = [data.id];
    let records = {modified:[], canceled:[]};
    if (data.buddies.length > 0) {
        let existing = await getOverlappingReservations(data, data.buddies);
        let modify = existing
            .filter(rsv => save.includes(rsv.user.id))
            .map(rsv => {
                let buddies = save.filter(id => id != rsv.user.id);
                return {...rsv, buddies};
            });
        if (modify.length > 0) {
            let modrecs = await xata.db.Reservations.update(modify);
            records.modified = modrecs;
        }

        remove = remove.concat(
            existing
                .filter(rsv => !save.includes(rsv.user.id))
                .map(rsv => rsv.id)
        );
    }

    let cancelrecs = await xata.db.Reservations.delete(remove);
    records.canceled = cancelrecs;

    return records;
}

export function checkSessionActive(route, cookies) {
    let session = cookies.get('sessionid');
    if (session === undefined) {
        if (route.id !== '/') {
            throw redirect(307, '/');
        }
    }
}
