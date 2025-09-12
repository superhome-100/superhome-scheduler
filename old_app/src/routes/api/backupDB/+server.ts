import { XataClient } from '$lib/server/xata.codegen';
import { XATA_API_KEY } from '$env/static/private';

const main = new XataClient({ apiKey: XATA_API_KEY, branch: 'main' });
const backup1 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-1' });
const backup2 = new XataClient({ apiKey: XATA_API_KEY, branch: 'backup-day-2' });

interface Record {
    id: string;
    [key: string]: any;
}

interface LinkedObject {
    id: string;
    [key: string]: any;
}

const updateLinks = (entries: Record[]): void => {
    if (entries.length > 0) {
        const links = Object.keys(entries[0]).filter((fld) => {
            const el = entries[0][fld];
            return el != null && typeof el == 'object' && Object.keys(el).includes('id');
        });
        
        for (let i = 0; i < entries.length; i++) {
            const ent = entries[i];
            const update: Record = { ...ent };
            for (const link of links) {
                const el = ent[link] as LinkedObject;
                update[link] = el.id;
            }
            entries[i] = update;
        }
    }
};

const deleteAll = async (branch: XataClient, tbl: string): Promise<void> => {
    if (branch !== main) {
        const data = await branch.db[tbl].getAll();
        const ids = data.map((rec: Record) => rec.id);
        await branch.db[tbl].delete(ids);
    }
};

export async function GET(): Promise<Response> {
    const errors: Error[] = [];
    //tables that are linked in other tables need to be backed up first
    const tables = [
        'Users',
        'PriceTemplates',
        'Notifications',
        'Reservations',
        'UserPriceTemplates',
        'NotificationReceipts',
        'Settings',
        'Buoys'
    ] as const;

    const backupPairs: [XataClient, XataClient][] = [
        [backup1, backup2],
        [main, backup1]
    ];

    for (const [from, to] of backupPairs) {
        for (const tbl of tables) {
            try {
                await deleteAll(to, tbl);
                const records = await from.db[tbl].getAll();
                updateLinks(records);
                await to.db[tbl].create(records);
            } catch (error) {
                console.error(error);
                errors.push(error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    if (errors.length === 0) {
        return new Response('back up completed at ' + new Date(), { 
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
        });
    } else {
        return new Response(errors.map(e => e.message).join('\n'), { 
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
        });
    }
}
