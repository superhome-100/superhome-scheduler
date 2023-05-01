import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

export async function GET(req) {
    const main = new XataClient({ apiKey: XATA_API_KEY });
    const backup = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup' });
    console.log(backup);
    let reservations = await main.db.Reservations.getAll();
    console.log("backing up " + reservations.length + " reservations");
    console.log(reservations[0]);
    await backup.db.Reservations.createOrUpdate(reservations);

    let users = await main.db.Users.getAll();
    console.log('backing up ' + users.length + ' users');
    await backup.db.Users.createOrUpdate(users);

    let now = new Date();
    return new Response('Backed up DB at ' + now);
}
