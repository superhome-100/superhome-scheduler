import { getXataClient } from '$lib/server/xata.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
import { json } from '@sveltejs/kit';

const xata = getXataClient();

export async function POST() {
    try {
        let tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate()+1);
        let tomStr = datetimeToLocalDateStr(tomorrow);
        let rsvs = await xata.db.Reservations
            .filter({
                date: tomStr,
                category: 'openwater',
                status: { $any: ['pending', 'confirmed'] }
            }).getAll();
        let buoys = await xata.db.Buoys.getAll();
        let updates = []
        for (let owTime of ['AM', 'PM']) {
            let result = assignRsvsToBuoys(buoys, rsvs.filter(rsv => rsv.owTime === owTime));
            for (let buoy of buoys) {
                let toAsn = result.assignments[buoy.name]
                if (toAsn != undefined) {
                    updates.push(...toAsn.map(rsv => { return { id: rsv.id, buoy: buoy.name }}));

                }
            }

        }
        let reservations = await xata.db.Reservations.update(updates);
        return json({ status: 'success', reservations });
    } catch (error) {
        return json({ status: 'error', error });
    }
}
