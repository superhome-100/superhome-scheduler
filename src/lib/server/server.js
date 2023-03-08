import { xata } from '$lib/xata';

export async function getReservations(params) {
    const { userId, view } = params;
    let today = new Date();
    let reservations = {};
    for (let tbl of ['OpenWaterReservations']) {
        if (view === 'upcoming') {
            reservations[tbl] = await xata.db.OpenWaterReservations.filter({
                date: {$ge: today.toISOString()},
                "user.facebook_id": userId,
            }).getAll();
        } else if (view === 'past') {
            reservations[tbl] = await xata.db.OpenWaterReservations.filter({
                date: {$lt: today.toISOString()},
                "user.facebook_id": userId,
            }).getAll();
        }
    }
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
