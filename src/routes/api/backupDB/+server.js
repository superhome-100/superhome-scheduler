import { XataClient } from '$lib/server/xata.codegen.server.js';
import { XATA_API_KEY } from '$env/static/private';

const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });
const backup1 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-1' });
const backup2 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-2' });

const updateLinks = (entries) => {
    if (entries.length > 0) {
        let links = Object.keys(entries[0])
            .filter(fld => typeof entries[0][fld] == 'object');
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

const deleteAll = async (branch, tbl) => {
    if (branch != main) {
        let data = await branch.db[tbl].getAll();
        let ids = data.map(rec => rec.id);
        await branch.db[tbl].delete(ids);
    }
};

export async function GET() {
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
                await deleteAll(to, tbl);
                let records = await from.db[tbl].getAll();
                updateLinks(records);
                await to.db[tbl].create(records);
            } catch (error ) {
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
