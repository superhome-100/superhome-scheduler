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
    const record = await xata.db.Reservations.create({
        ...data,
        maxDepth: 'maxDepth' in data ? parseInt(data.maxDepth) : null,
        numStudents: data.numStudents == null ? null : parseInt(data.numStudents),
    });
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
