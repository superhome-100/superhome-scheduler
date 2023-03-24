import { getXataClient } from '$lib/server/xata';
import { augmentRsv } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';

const xata = getXataClient();

export async function getSettings() {
    let settings = await xata.db.Settings.getAll();
    return settings;
}

export async function getSession(id) {
    let records = await xata.db.Sessions
        .select(['*', 'user.facebookId', 'user.name'])
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
    return reservations.map((r) => augmentRsv(r));
}

export async function getActiveUsers() {
    let users = await xata.db.Users
        .filter({ status: "active" })
        .getAll();
    return users;
}

export async function getUserReservations(userId) {
    let rsvs = await xata.db.Reservations
        .filter({
            "user.facebookId": userId})
        .sort("date", "asc")
        .getAll();

    let reservations = [];
    for (let rsv of rsvs) {
        let newRsv = augmentRsv(rsv);
        reservations.push(newRsv);
    }
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

export async function submitReservation(formData) {
    let data = Object.fromEntries(formData);

    let buddies = {'name': [], 'id': []};
    let numBuddies = data.numBuddies;
    let owner = data.name;
    delete data.name;
    for (let i=0; i < numBuddies; i++) {
        buddies.name.push(data['buddy' + i]),
        buddies.id.push(data['buddy' + i + '_id']),
        delete data['buddy' + i];
        delete data['buddy' + i + '_id'];
    }
    delete data.numBuddies;
    let { user, ...common } = data;
    common = {
        ...common,
        maxDepth: 'maxDepth' in common ? parseInt(common.maxDepth) : null,
        numStudents: common.numStudents == null ? null : parseInt(common.numStudents)
    };

    const record = await xata.db.Reservations.create({
        ...common,
        user,
        buddies,
    });

    for (let i=0; i < numBuddies; i++) {
        let buddyGrp = {
            'name': [owner, ...buddies.name.slice(0,i).concat(buddies.name.slice(i+1))],
            'id': [user, ...buddies.id.slice(0,i).concat(buddies.id.slice(i+1))]
        };
        console.log(buddyGrp);
        await xata.db.Reservations.create({
            ...common,
            user: buddies.id[i],
            buddies: buddyGrp,
        });
    }

    return record;
}

export async function updateReservation(formData) {
    let {id, ...rsv} = Object.fromEntries(formData);
    const record = xata.db.Reservations.createOrReplace(id, {
        ...rsv,
        maxDepth: 'maxDepth' in rsv ? parseInt(rsv.maxDepth) : null,
        numStudents: rsv.numStudents == null ? null: parseInt(rsv.numStudents),
    });
    return record;
}


export async function cancelReservation(formData) {
    let data = Object.fromEntries(formData);
    const record = await xata.db.Reservations.delete(data.id);
    return record;
}

export function checkSessionActive(route, cookies) {
    let session = cookies.get('sessionid');
    if (session === undefined) {
        if (route.id !== '/') {
            throw redirect(307, '/');
        }
    }
}
