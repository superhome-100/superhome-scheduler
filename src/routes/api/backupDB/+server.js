import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

const updateLinks = (entries) => {
    if (entries.length > 0) {

        let links = Object.keys(entries[0])
            .filter(fld => fld.endsWith('.id'))
            .map(fld => fld.slice(0,-3));

        for (let i=0; i < entries.length; i++) {
            let ent = entries[i];
            let update = {...ent};
            for (let link of links) {
                let el = ent[link];
                update[link] = el.id;
            }
            entries[i] = update;
        }
    }
};

export async function GET() {
    const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });
    const backup1 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-1' });
    const backup2 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-2' });

    let errors = [];
    let tables = [
        'Users',
        'PriceTemplates',
        'Notifications',
        'Reservations',
        'UserPriceTemplates',
        'NotificationReceipts',
        'Settings',
        'Buoys'
    ];

    for (let [from, to] of [[backup1, backup2], [main, backup1]]) {
        for (let tbl of tables) {
            try {
                let records = await from.db[tbl].getAll();
                updateLinks(records);
                await to.db[tbl].createOrUpdate(records);
            } catch (error ) {
                console.log(error);
                errors.push(error);
            }
        }
    }
    if (errors.length == 0) {
        return new Response('back up completed at ' + new Date(), {ok: true, status: 200});
    } else {
        return new Response(errors.toString(), {ok: false, status: 500});
    }
}
