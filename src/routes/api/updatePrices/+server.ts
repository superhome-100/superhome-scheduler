import type { RequestEvent } from '@sveltejs/kit';

import {
	datetimeToDateStr,
	datetimeInPanglaoFromServer,
	timeStrToMin,
	firstOfMonthStr
} from '$lib/datetimeUtils';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus } from '$types';
import type { Tables } from '$lib/supabase.types';

const unpackTemplate = (uT: {
	user: string | null;
	PriceTemplates: {
		autoOW: number | null;
		autoPool: number | null;
		cbsOW: number | null;
		coachClassroom: number | null;
		coachOW: number | null;
		coachPool: number | null;
		'comp-setupOW': number | null;
		createdAt: string;
		id: string;
		platformCBSOW: number | null;
		platformOW: number | null;
		proSafetyOW: number | null;
		updatedAt: string;
	};
}) => {
	return {
		pool: {
			course: uT.PriceTemplates.coachPool,
			autonomous: uT.PriceTemplates.autoPool
		},
		classroom: {
			course: uT.PriceTemplates.coachClassroom
		},
		openwater: {
			course: uT.PriceTemplates.coachOW,
			autonomous: uT.PriceTemplates.autoOW,
			cbs: uT.PriceTemplates.cbsOW,
			proSafety: uT.PriceTemplates.proSafetyOW,
			autonomousPlatform: uT.PriceTemplates.platformOW,
			autonomousPlatformCBS: uT.PriceTemplates.platformCBSOW,
			competitionSetupCBS: uT.PriceTemplates['comp-setupOW']
		}
	};
};

async function getOldAndNewRsvs(date: string) {
	const { data: reservations } = await supabaseServiceRole
		.from('Reservations')
		.select('*')
		.gte('date', firstOfMonthStr(date))
		.lte('date', date)
		.eq('status', ReservationStatus.confirmed)
		.throwOnError();
	let oldRsvs = reservations.filter((rsv) => rsv.price != null);
	let newRsvs = reservations.filter((rsv) => rsv.price == null);
	return { oldRsvs, newRsvs };
}

async function getTemplates(newRsvs: Tables<'Reservations'>[]) {
	const uIds = Array.from(new Set(newRsvs.map((rsv) => rsv.user)));
	const { data: userTemplates } = await supabaseServiceRole
		.from('UserPriceTemplates')
		.select('user, PriceTemplates(*)')
		.in('user', uIds)
		.throwOnError();
	return userTemplates;
}

const calcNAutoOW = (user: string | null, oldRsvs: Tables<'Reservations'>[]) => {
	return oldRsvs.filter((rsv) => {
		return rsv.user === user && rsv.resType === 'autonomous' && rsv.category === 'openwater';
	}).length;
};

const getStart = (rsv: Tables<'Reservations'>) => {
	return timeStrToMin(rsv.startTime);
};

export async function GET({ locals: { user, settings } }: RequestEvent) {
	try {
		checkAuthorisation(user);

		let d = datetimeInPanglaoFromServer();
		let date = datetimeToDateStr(d);
		let time = d.getHours() * 60 + d.getMinutes();
		let maxChgbl = settings.getMaxChargeableOWPerMonth(date);

		let { oldRsvs, newRsvs } = await getOldAndNewRsvs(date);
		if (newRsvs.length > 0) {
			let userTemplates = await getTemplates(newRsvs);

			for (let uT of userTemplates) {
				let tmp = unpackTemplate(uT);
				let nAutoOW = calcNAutoOW(uT.user, oldRsvs);
				let rsvs = newRsvs.filter((rsv) => rsv.user === uT.user);
				for (let rsv of rsvs) {
					let start = getStart(rsv);
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
							if (!rsv.numStudents) throw Error(`numStudents error: ${rsv}`);
							price = tmp[rsv.category][rsv.resType];
							if (rsv.resType === 'course') {
								price *= rsv.numStudents;
							}
						}
						try {
							await supabaseServiceRole.from('Reservations')
								.update({ price })
								.eq("id", rsv.id);
						} catch (e) {
							console.error(`error updating price for ${rsv.id}: ${e}`);
						}
					}
				}
			}
		}
		return new Response('prices updated', { status: 200 });
	} catch (error) {
		console.log(error);
		if (error instanceof AuthError) {
			return new Response(error.message, { status: error.code });
		}
		return new Response(`${error}`, { status: 500 });
	}
}
