import { getXataClient } from '$lib/server/xata';

const xata = getXataClient();

export async function getReservations(params) {
    const { userId } = params;
    let reservations = await xata.db.Reservations
        .filter({
            "user.facebook_id": userId})
        .sort("date", "asc")
        .getAll();

    return { reservations };
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

export async function authenticateUser(params) {
    let status;
    const { userId } = params;
    let records = await xata.db.Users
        .filter({ "facebook_id" : userId })
        .getMany({pagination: {size: 1}});
    if (records.length == 0) {
        /* user does not exist yet */
        status = await addUser(params);
    } else {
        status = records[0].status;
    }

    return status;
}
