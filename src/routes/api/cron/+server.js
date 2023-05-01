import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

export async function GET() {
    const main = new XataClient({ apiKey: XATA_API_KEY });
    const backup = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup' });

    let users = await main.db.Users.getAll();
    await backup.db.Users.createOrUpdate(users);

    let reservations = await main.db.Reservations.getAll();
    for (let i=0; i<reservations.length; i++) {
        let {id, user, ...rest} = reservations[i];
        if (i % 50 == 0) {
            setTimeout(()=>{}, 1000);
        }
        await backup.db.Reservations.createOrUpdate(id, {...rest, user: user.id});
    }
}
