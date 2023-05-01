import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

export async function GET(req) {
    const main = new XataClient({ apiKey: XATA_API_KEY });
    const backup = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup' });

    let reservations = await main.db.Reservations.getAll();
    await backup.db.Reservations.createOrUpdate(reservations);

    let users = await main.db.Users.getAll();
    await backup.db.Users.createOrUpdate(users);

    let now = new Date();
    return new Response('Backed up DB at ' + now);
}
