import type { RequestEvent } from '@sveltejs/kit';
import { PRIVATE_CRON_SECRET } from '$env/static/private';
import {
	datetimeToDateStr,
	datetimeInPanglaoFromServer,
	timeStrToMin,
	firstOfMonthStr
} from '$lib/datetimeUtils';
import { AuthError, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus, type Reservation } from '$types';
import { console_error } from '$lib/server/sentry';
import { pushNotificationService } from '$lib/server/push';

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

async function getTemplates(newRsvs: Reservation[]) {
	const uIds = Array.from(new Set(newRsvs.map((rsv) => rsv.user)));
	const { data: userTemplates } = await supabaseServiceRole
		.from('UserPriceTemplates')
		.select('user, PriceTemplates(*)')
		.in('user', uIds)
		.throwOnError();
	return userTemplates;
}

const calcNAutoOW = (user: string | null, oldRsvs: Reservation[]) => {
	return oldRsvs.filter((rsv) => {
		return rsv.user === user && rsv.resType === 'autonomous' && rsv.category === 'openwater';
	}).length;
};

const getStart = (rsv: Reservation) => {
	return timeStrToMin(rsv.startTime);
};

/**
 * Between 8 am to 8 pm, evey 1 hour, check reservations that are in completed status, if the price is not Null, set the price, If it's already manually set, leave the existing numbers.
 * price just need to match the price template that assigned to that use, and follow below rules:
 * coaching session such as for OW, price = coachOW x Number of students (free for instructor)
 * autonomous session such as for OW, price = autoOW (x 1).
 * and for now only below is useful:
 * - coachOW: OW coaching
 * - coachPool: Pool coaching
 * - coachClassroom: Classroom coaching
 * - autoOW: OW autonomous on Buoy
 * - autoPool: Pool autonomous
 * - platformOW: OW autonomous on Platform
 * - platformCBSOW: OW autonomous on Platform + CBS
 */
export async function GET({ request, locals: { settings } }: RequestEvent) {
	try {
		const authHeader = request.headers.get('X-Cron-Secret');

		if (authHeader !== PRIVATE_CRON_SECRET) {
			console_error('api/updatePrices', new Error('secret error'))
			return new Response('Unauthorized', { status: 401 });
		}

		await pushNotificationService.send('7ff0f2e8-8ce8-480b-b83c-ad1476495716', 'api/updatePrices', authHeader);

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
							price = tmp[rsv.category][rsv.resType];
							if (rsv.resType === 'course') {
								if (!rsv.numStudents) throw Error(`numStudents error: ${rsv.id}`);
								price *= rsv.numStudents;
							}
						}
						try {
							await supabaseServiceRole.from('Reservations')
								.update({ price })
								.eq("id", rsv.id);
						} catch (e) {
							console_error(`error updating price`, e, rsv.id);
						}
					}
				}
			}
		}
		return new Response('prices updated', { status: 200 });
	} catch (error) {
		console_error('api/updatePrices', error, request);
		if (error instanceof AuthError) {
			return new Response(error.message, { status: error.code });
		}
		return new Response(`${error}`, { status: 500 });
	}
}
