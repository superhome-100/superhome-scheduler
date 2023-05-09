import { getXataClient } from '$lib/server/xata.js';
import { json } from '@sveltejs/kit';

const xata = getXataClient();

export async function GET() {
    try {
        let assignments = await xata.db.Boats.getAll();
        assignments = assignments.reduce((obj, ent) => {
            obj[ent.id] = JSON.parse(ent.assignments);
            return obj;
        }, {});
        return json({ status: 'success', assignments });
    } catch (error) {
        return json({status: 'error', error });
    }
}
