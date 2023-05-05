import { getXataClient } from '$lib/server/xata.js';
import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
import { buoys } from '$lib/stores.js';
import { get } from 'svelte/store';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';

const xata = getXataClient();

export async function GET() {
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+1);
    let tomStr = datetimeToLocalDateStr(tomorrow);
    let rsvs = await xata.db.Reservations
        .filter({ date: tomStr, category: 'openwater', status: { $any: ['pending', 'confirmed'] }})
        .getAll();

    let updates = []
    for (let owTime of ['AM', 'PM']) {
        let result = assignRsvsToBuoys(get(buoys), rsvs.filter(rsv => rsv.owTime === owTime));
        for (let buoy of get(buoys)) {
            let toAsn = result.assignments[buoy.name]
            if (toAsn != undefined) {
                updates.push(...toAsn.map(rsv => { return { id: rsv.id, buoy: buoy.name }}));

            }
        }

    }
    await xata.db.Reservations.update(updates);
}
