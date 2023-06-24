import { getXataClient } from '$lib/server/xata-old';
import { assignRsvsToBuoys } from '$lib/autoAssignOpenWater.js';
import { json } from '@sveltejs/kit';

const xata = getXataClient();

export async function POST({ request }) {
	try {
		let { lock, date } = await request.json();
		let rsvs = await xata.db.Reservations.filter({
			date,
			category: 'openwater',
			status: { $any: ['pending', 'confirmed'] }
		}).getAll();
		// remove const
		rsvs = rsvs.map((rsv) => {
			return { ...rsv };
		});
		let updates = [];
		if (lock) {
			let buoys = await xata.db.Buoys.getAll();
			for (let owTime of ['AM', 'PM']) {
				let result = assignRsvsToBuoys(
					buoys,
					rsvs.filter((rsv) => rsv.owTime === owTime)
				);
				for (let buoy of buoys) {
					let toAsn = result.assignments[buoy.name];
					if (toAsn != undefined) {
						updates.push(
							...toAsn.map((rsv) => {
								return { id: rsv.id, buoy: buoy.name };
							})
						);
					}
				}
			}
		} else {
			updates = rsvs.map((rsv) => {
				return { id: rsv.id, buoy: 'auto' };
			});
		}

		let reservations = await xata.db.Reservations.update(updates);
		return json({ status: 'success', reservations });
	} catch (error) {
		return json({ status: 'error', error });
	}
}
