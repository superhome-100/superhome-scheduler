import { getXataClient } from '$lib/server/xata.js';
import { convertReservationTypes } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';

const xata = getXataClient();

export async function getSettings() {
    let settingsTbl = await xata.db.Settings.getAll();
    let buoys = await xata.db.Buoys.getAll();
    return { settingsTbl, buoys };
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

export async function submitReservation(formData) {
    let rsv = convertReservationTypes(Object.fromEntries(formData));
    let record = await xata.db.Reservations.create(rsv);
    return record;
}

/*
export async function submitReservationPerBuddy(formData) {

    let { name, numBuddies, buddies, buddyIds, data } = separateBuddyDetails(Object.fromEntries(formData));
    let { user, ...common } = data;
    common = {
        ...common,
        maxDepth: 'maxDepth' in common ? parseInt(common.maxDepth) : null,
        numStudents: common.numStudents == null ? null : parseInt(common.numStudents)
    };

    // first create each buddy's record to get the reservation IDs
    let entries = [{...common, user, buddies}];
    for (let i=0; i < numBuddies; i++) {
        let buddyGrp = {
            'name': [name, ...buddies.name.slice(0,i).concat(buddies.name.slice(i+1))],
        };
        entries.push({
            ...common,
            user: buddyIds[i],
            buddies: buddyGrp,
            owner: false
        });
    };
    const initRecs = await xata.db.Reservations.create(entries);
    buddies.resIds = initRecs.map((r) => r.id);

    let ownerRec;
    // then update the records with the other buddies' IDs
    if (numBuddies > 0) {
        entries = []
        for (let i=0; i < numBuddies+1; i++) {
            entries.push({
                id: initRecs[i].id,
                'buddies.resId': [...initRecs.slice(0,i).map((rec)=>rec.id).concat(initRecs.slice(i+1).map((rec)=>rec.id))]
            });
        }
        const records = await xata.db.Reservations.update(entries);
        ownerRec = records[0];
    } else {
        ownerRec = initRecs[0];
    }
    return ownerRec;
}
*/

export async function updateReservation(formData) {
    let {id, ...rest} = Object.fromEntries(formData);
    rest = convertReservationTypes(rest);
    rest.status = 'pending';
    const record = xata.db.Reservations.update(id, rest);
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
