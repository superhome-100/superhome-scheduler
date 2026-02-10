import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	firstOfMonthStr,
	fromPanglaoDateTimeStringToDayJs,
	PanglaoDayJs,
	getYYYYMMDD
} from '$lib/datetimeUtils';
import { AuthError, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus, type Reservation, type ReservationWithPrices } from '$types';
import { console_error } from '$lib/server/sentry';
import type { Tables } from '$lib/supabase.types';
import { getSettingsManager } from '$lib/settings';

const unpackTemplate = (uT: {
	user: string;
	PriceTemplates: Tables<'PriceTemplates'>;
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

/**
 * Between 8 am to 8 pm, evey 1 hour, check reservations that are in completed status, if the price is not Null, set the price, 
 * If it's already manually set, leave the existing numbers.
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
 * - there is a maximum chargable settings, see code
 */
export async function GET({ request }: RequestEvent) {
	try {
		const authHeader = env.PRIVATE_CRON_SECRET//TODO:mate: request.headers.get('X-Cron-Secret');
		if (authHeader !== env.PRIVATE_CRON_SECRET) {
			console_error('api/admin/updatePrices', new Error('secret error'));
			return new Response('Unauthorized', { status: 401 });
		}

		const now = PanglaoDayJs()
		const nowDay = getYYYYMMDD(PanglaoDayJs());
		// need to use supabaseServiceRole because this code run from scheduled worker without user
		let maxChgbl = (await getSettingsManager(supabaseServiceRole)).getMaxChargeableOWPerMonth(nowDay);

		console.info('api/admin/updatePrices', { now, nowDay, maxChgbl });

		const { data: reservations } = await supabaseServiceRole
			.from('ReservationsWithPrices')
			.select('*')
			.gte('date', firstOfMonthStr(nowDay))
			.lte('date', nowDay)
			.eq('status', ReservationStatus.confirmed)
			.order("date")
			.order("startTime")
			.overrideTypes<ReservationWithPrices[]>()
			.throwOnError();

		const oldRsvs = reservations.filter((rsv) => rsv.price != null);
		const newRsvs = reservations.filter((rsv) => rsv.price == null);
		if (newRsvs.length > 0) {
			let userTemplates = await getTemplates(newRsvs);

			for (let uT of userTemplates) {
				const tmp = unpackTemplate(uT);
				let nAutoOW = calcNAutoOW(uT.user, oldRsvs);
				const rsvs = newRsvs.filter((rsv) => rsv.user === uT.user);
				for (let rsv of rsvs) {
					let rsvStart = fromPanglaoDateTimeStringToDayJs(`${rsv.date}T${rsv.startTime}`);
					if (rsvStart <= now) {
						let price;
						if (rsv.category === 'openwater' && rsv.resType === 'autonomous') {
							nAutoOW++;
							if (nAutoOW > maxChgbl) {
								price = 0;
							} else {
								price = tmp[rsv.category][rsv.resType];
							}
						} else {
							const categoryPrice = tmp[rsv.category];
							if (!(rsv.resType in categoryPrice))
								throw Error(`assert ${rsv.id}: ${rsv.resType} !in ${categoryPrice}`);
							price = categoryPrice[rsv.resType];
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
		console_error('api/admin/updatePrices', error, request);
		if (error instanceof AuthError) {
			return new Response(error.message, { status: error.code });
		}
		return new Response(`${error}`, { status: 500 });
	}
}
