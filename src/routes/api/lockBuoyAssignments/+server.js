import { getXataClient } from '$lib/server/xata.js';
import { timeStrToMin, datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
import { json } from '@sveltejs/kit';
import { Settings } from '$lib/server/settings.js';

const xata = getXataClient();

export async function POST() {
    try {
        await Settings.init();
        let date = new Date();
        let startTime = Settings.get('openwaterAmStartTime', datetimeToLocalDateStr(date));
        let curMin = date.getHours()*60 + date.getMinutes();
        if (curMin > timeStrToMin(startTime)) {
            date.setDate(date.getDate()+1);
        }
        let dateStr = datetimeToLocalDateStr(date);
        let rsvs = await xata.db.Reservations
            .filter({
                date: dateStr,
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
        console.log(updates);
        let reservations = await xata.db.Reservations.update(updates);
        return json({ status: 'success', reservations });
    } catch (error) {
        return json({ status: 'error', error });
    }
}
