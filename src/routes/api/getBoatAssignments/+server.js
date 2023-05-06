import { getXataClient } from '$lib/server/xata.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
import { json } from '@sveltejs/kit';

const xata = getXataClient();

export async function GET() {
    try {
        let today = datetimeToLocalDateStr(new Date());
        let assignments = await xata.db.Boats.filter({id: { $ge: today }}).getAll();
        assignments = assignments.reduce((obj, ent) => {
            obj[ent.id] = JSON.parse(ent.assignments);
            return obj;
        }, {});
        return json({ status: 'success', assignments });
    } catch (error) {
        return json({status: 'error', error });
    }
}
