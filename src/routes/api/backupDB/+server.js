import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

export async function GET() {
    try {
        const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });
        const backup1 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-1' });
        const backup2 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-2' });

        for (let [from, to] of [[backup1, backup2], [main, backup1]]) {
            let users = await from.db.Users.getAll();
            await to.db.Users.createOrUpdate(users);

            let reservations = await from.db.Reservations.getAll();
            for (let i=0; i<reservations.length; i++) {
                let {user, ...rest} = reservations[i];
                reservations[i] = {...rest, user: user.id};
            }
            await to.db.Reservations.createOrUpdate(reservations);
        }
        return Response('back up completed at ' + new Date(), {ok: true, status: 200});
    } catch (error) {
        return Response(error, {ok: false, status: 500});
    }
}
