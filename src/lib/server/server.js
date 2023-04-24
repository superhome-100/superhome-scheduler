import { getXataClient } from '$lib/server/xata.js';
import { convertReservationTypes } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';

const xata = getXataClient();

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
        .select(['*', 'user.privileges', 'user.facebookId', 'user.name'])
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
        "status": "active"
    });
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
        filters.startTime = sub.startTime;
        filters.endTime = sub.endTime;
    }
    let existing = await xata.db.Reservations.filter(filters).getAll();
    return existing;
}

export async function submitReservation(formData) {
    let sub = convertReservationTypes(Object.fromEntries(formData));
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
            existing = await getBuddyReservations(sub, oldBuddies);
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
    if (formData.has('lane1')) {
        const convert = (v) => v === 'undefined' ? undefined : v;
        if (convert(formData.get('lane1'))) {
            rsv.lanes = [formData.get('lane1')];
        } else {
            rsv.lanes = [];
        }
        if (convert(formData.get('lane2'))) {
            rsv.lanes[1] = formData.get('lane2');
        }
    } else if (formData.has('buoy')) {
        rsv.buoy = formData.get('buoy');
    } else if (formData.has('room')) {
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
