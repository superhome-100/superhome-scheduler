import { getXataClient } from '$lib/server/xata-old';

const xata = getXataClient();

import {
	datetimeToDateStr,
	datetimeInPanglaoFromServer,
	timeStrToMin,
	firstOfMonthStr
} from '$lib/datetimeUtils';
import { initSettings } from '$lib/server/settings';

const unpackTemplate = (uT) => {
	return {
		pool: {
			course: uT.priceTemplate.coachPool,
			autonomous: uT.priceTemplate.autoPool
		},
		classroom: {
			course: uT.priceTemplate.coachClassroom
		},
		openwater: {
			course: uT.priceTemplate.coachOW,
			autonomous: uT.priceTemplate.autoOW,
			cbs: uT.priceTemplate.cbsOW,
			proSafety: uT.priceTemplate.proSafetyOW,
			autonomousPlatform: uT.priceTemplate.platformOW,
			autonomousPlatformCBS: uT.priceTemplate.platformCBSOW
		}
	};
};

async function getOldAndNewRsvs(date) {
	let reservations = await xata.db.Reservations.filter({
		status: 'confirmed',
		date: { $le: date, $ge: firstOfMonthStr(date) }
	}).getAll();

	let oldRsvs = reservations.filter((rsv) => rsv.price != null);
	let newRsvs = reservations.filter((rsv) => rsv.price == null);
	return { oldRsvs, newRsvs };
}

async function getTemplates(newRsvs) {
	let uIds = Array.from(new Set(newRsvs.map((rsv) => rsv.user.id)));
	let userTemplates = await xata.db.UserPriceTemplates.filter({ user: { $any: uIds } })
		.select(['user', 'priceTemplate'])
		.getAll();
	return userTemplates;
}

const calcNAutoOW = (user, oldRsvs) => {
	return oldRsvs.filter((rsv) => {
		return rsv.user.id === user && rsv.resType === 'autonomous' && rsv.category === 'openwater';
	}).length;
};

const getStart = (rsv, amOWTime, pmOWTime) => {
	return ['pool', 'classroom'].includes(rsv.category)
		? timeStrToMin(rsv.startTime)
		: rsv.category === 'openwater'
		? rsv.owTime === 'AM'
			? amOWTime
			: pmOWTime
		: undefined;
};

export async function GET() {
	try {
		const settings = await initSettings();

		let d = datetimeInPanglaoFromServer();
		let date = datetimeToDateStr(d);
		let time = d.getHours() * 60 + d.getMinutes();
		let maxChgbl = settings.getMaxChargeableOWPerMonth(date);
		let amOWStart = timeStrToMin(settings.getOpenwaterAmStartTime(date));
		let pmOWStart = timeStrToMin(settings.getOpenwaterPmStartTime(date));

		let { oldRsvs, newRsvs } = await getOldAndNewRsvs(date);
		if (newRsvs.length > 0) {
			let updates = [];
			let userTemplates = await getTemplates(newRsvs);

			for (let uT of userTemplates) {
				let tmp = unpackTemplate(uT);
				let nAutoOW = calcNAutoOW(uT.user.id, oldRsvs);
				let rsvs = newRsvs.filter((rsv) => rsv.user.id === uT.user.id);
				for (let rsv of rsvs) {
					let start = getStart(rsv, amOWStart, pmOWStart);
					if (rsv.date < date || (rsv.date === date && start <= time)) {
						let price;
						if (rsv.category === 'openwater' && rsv.resType === 'autonomous') {
							nAutoOW++;
							if (nAutoOW > maxChgbl) {
								price = 0;
							} else {
								price = tmp[rsv.category][rsv.resType];
							}
						} else {
							price = tmp[rsv.category][rsv.resType];
							if (rsv.resType === 'course') {
								price *= rsv.numStudents;
							}
						}
						updates.push({ id: rsv.id, price });
					}
				}
			}
			if (updates.length > 0) {
				await xata.db.Reservations.update(updates);
			}
		}
		return new Response('prices updated', { status: 200 });
	} catch (error) {
		console.log(error);
		return new Response(error, { status: 500 });
	}
}
