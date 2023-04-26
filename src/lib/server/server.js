import { getXataClient } from '$lib/server/xata.js';
import { checkSpaceAvailable, convertReservationTypes, parseSettingsTbl } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { getOn } from '$lib/settings.js';
import { startTimes, endTimes } from '$lib/ReservationTimes.js';

const xata = getXataClient();

let settingsStore = null;
const Settings = {
    init: async () => {
        if (!settingsStore) {
            let settingsTbl = await xata.db.Settings.getAll();
            settingsStore = parseSettingsTbl(settingsTbl);
        }
    },
    get: (name, date) => {
        let setting = settingsStore[name];
        return getOn(setting, date);
    }
};

export async function getTableCsv(table) {
    let fields = ['user.name', 'date', 'category', 'status',
        'resType', 'numStudents', 'owTime', 'startTime', 'endTime'];
    let records = await xata.db[table]
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
        .select(["*", "user.facebookId", "user.name"])
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

async function getBuddyReservations(sub, buddies) {
    let filters = {
        date: sub.date,
        category: sub.category,
        'user.id': { $any : buddies },
    };
    if (sub.category === 'openwater') {
        filters.owTime = sub.owTime;
    } else if (['pool', 'classroom'].includes(sub.category)) {
        await Settings.init();

        let sTs = startTimes(Settings, sub.date, sub.category);
        let eIdx = sTs.indexOf(sub.endTime);
        if (eIdx < 0) { eIdx = sTs.length; }
        let startVals = sTs.slice(sTs.indexOf(sub.startTime), eIdx);
        let eTs = endTimes(Settings, sub.date, sub.category);
        let sIdx = eTs.indexOf(sub.startTime)+1;
        if (sIdx == -1) { sIdx = 0; }
        let endVals = eTs.slice(sIdx, eTs.indexOf(sub.endTime)+1);
        filters.$any = {
            startTime: { $any: startVals },
            endTime: { $any: endVals },
        };
    }
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
    existing = [...existing, ...buddies];
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

    // classroom bookings are confirmed automatically
    sub.status = sub.category === 'classroom' ? 'confirmed' : 'pending';

    let entries = [sub];
    if (sub.buddies.length > 0) {
        let { user, buddies, ...common } = sub;
        let existing = await getBuddyReservations(sub, sub.buddies);
        if (existing.length > 0) {
            return {
                status: 'error',
                code: 'BUDDY_RSV_EXISTS'
            };
        }

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

export async function updateReservation(formData) {
    let {oldBuddies, ...sub} = convertReservationTypes(Object.fromEntries(formData));
    sub.status = sub.category === 'classroom' ? 'confirmed' : 'pending';
    oldBuddies = oldBuddies ? oldBuddies : [];

    let newBuddies = sub.buddies.filter(id => !oldBuddies.includes(id));
    if (newBuddies.length > 0) {
        let preExisting = await getBuddyReservations(sub, newBuddies);
        if (preExisting.length > 0) {
            return {
                status: 'error',
                code: 'BUDDY_RSV_EXISTS'
            };
        }
    }

    let buddySet = new Set(sub.buddies);
    for (let id of oldBuddies) {
        buddySet.add(id);
    }

    let modify = [sub];
    let create = [];
    let remove = [];

    if (buddySet.size > 0) {
        let existing;
        let { user, buddies, id, ...common } = sub;
        if (oldBuddies.length > 0) {
            let orig = await xata.db.Reservations.read(id);
            existing = await getBuddyReservations(orig, oldBuddies);
        }

        for (let bId of buddySet) {
            if (buddies.includes(bId) && oldBuddies.includes(bId)) {
                // modify
                let rsvId = existing.filter(rsv => rsv.user.id === bId)[0].id;
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
                let rsvId = existing.filter(rsv => rsv.user.id === bId)[0].id;
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
    const convert = (f) => formData.get(f) === 'null' ? null : formData.get(f);

    let v = convert('lane1');
    if (v) {
        rsv.lanes = [v];
        v = convert('lane2');
        if (v) {
            rsv.lanes[1] = v;
        }
    } else {
        rsv.lanes = [];
    }

    v = convert('buoy');
    if (v) {
        rsv.buoy = v;
    }
    v = convert('room');
    if (v) {
        rsv.room = v;
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
        let existing = await getBuddyReservations(data, data.buddies);
        let modify = existing
            .filter(rsv => save.includes(rsv.user.id))
            .map(rsv => {
                let buddies = save.filter(id => id != rsv.user.id);
                return {...rsv, buddies};
            });
        let modrecs = await xata.db.Reservations.update(modify);
        records.modified = modrecs;

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
