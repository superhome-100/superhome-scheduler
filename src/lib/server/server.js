import { getXataClient } from '$lib/server/xata';
import { datetimeParseDate, datetimeToLocalDateStr } from '$lib/ReservationTimes.js';

const xata = getXataClient();

export async function getFutureReservations() {
    let today = new Date().toISOString();
    let rsvs = await xata.db.Reservations
        .filter({ date: { $ge: today }})
        .sort("date", "asc")
        .getAll();

    let users = await xata.db.Users.getAll();

    let reservations = {'pool': [], 'openwater': [], 'classroom': []};
    for (let rsv of rsvs) {
        for (let user of users) {
            if (user.id == rsv.user.id) {
                let newRsv = {
                    ...rsv,
                    name: user.name,
                    facebook_id: user.facebook_id,
                    dateISO: rsv.date.toISOString(),
                    dateStr: datetimeToLocalDateStr(rsv.date),
                    date: datetimeParseDate(rsv.date)
                };
                reservations[rsv.category].push(newRsv);
                break;
            }
        }
    }
    return reservations;
}

export async function getUserReservations(userId) {
    let rsvs = await xata.db.Reservations
        .filter({
            "user.facebook_id": userId})
        .sort("date", "asc")
        .getAll();

    let reservations = [];
    for (let rsv of rsvs) {
        let newRsv = {
            ...rsv,
            dateISO: rsv.date.toISOString(),
            dateStr: datetimeToLocalDateStr(rsv.date),
            date: datetimeParseDate(rsv.date)
        };
        reservations.push(newRsv);
    }
    return reservations;
}

export async function addUser(params) {
    const { userId, userName } = params;
    const { status  } = await xata.db.Users.create({
        "facebook_id": userId,
        "name": userName,
        "status": "active"
    });
    return status;
}

export async function authenticateUser(userId, userName) {
    let status;
    let records = await xata.db.Users
        .filter({ "facebook_id" : userId })
        .getMany({pagination: {size: 1}});
    if (records.length == 0) {
        /* user does not exist yet */
        status = await addUser(userId, userName);
    } else {
        status = records[0].status;
    }

    return status;
}

export function submitReservation(data) {
    console.log(data);
}
