import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

export async function GET() {
    const main = new XataClient({ apiKey: XATA_API_KEY });
    const backup = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup' });
    let reservations = await main.db.Reservations.getAll();
    for (let i=0; i<reservations.length; i++) {
        if (i % 50 == 0) {
            setTimeout(()=>{}, 1000);
        }
        let {id, ...rest} = reservations[i];
        await backup.db.Reservations.createOrUpdate(id, rest);
    }

    let users = await main.db.Users.getAll();
    for (let i=0; i < users.length; i++) {
        if (i % 50 == 0) {
            setTimeout(()=>{}, 1000);
        }
        let {id, ...rest} = users[i];
        await backup.db.Users.createOrUpdate(id, rest);
    }
}
