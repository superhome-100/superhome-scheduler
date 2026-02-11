import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	firstOfMonthStr,
	fromPanglaoDateTimeStringToDayJs,
	PanglaoDayJs,
	getYYYYMMDD
} from '$lib/datetimeUtils';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus, type ReservationWithPrices } from '$types';
import { console_error } from '$lib/server/sentry';
import { getSettingsManager } from '$lib/settings';

const unpackTemplate = (r: ReservationWithPrices) => {
	return {
		pool: {
			course: r.priceTemplate.coachPool,
			autonomous: r.priceTemplate.autoPool
		},
		classroom: {
			course: r.priceTemplate.coachClassroom
		},
		openwater: {
			course: r.priceTemplate.coachOW,
			autonomous: r.priceTemplate.autoOW,
			cbs: r.priceTemplate.cbsOW,
			proSafety: r.priceTemplate.proSafetyOW,
			autonomousPlatform: r.priceTemplate.platformOW,
			autonomousPlatformCBS: r.priceTemplate.platformCBSOW,
			competitionSetupCBS: r.priceTemplate['comp-setupOW']
		}
	};
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
export async function GET({ request, locals: { user } }: RequestEvent) {
	try {
		try {
			checkAuthorisation(user, 'admin');
		} catch {
			const authHeader = request.headers.get('X-Cron-Secret');
			if (authHeader !== env.PRIVATE_CRON_SECRET) {
				console_error('api/admin/updatePrices', new Error('secret error'));
				return new Response('Unauthorized', { status: 401 });
			}
		}

		const now = PanglaoDayJs()
		const nowDay = getYYYYMMDD(PanglaoDayJs());
		// need to use supabaseServiceRole because this code run from scheduled worker without user so 
		// `locals:{supabase}` is not working here
		const maxChargeableOWPerMonth = (await getSettingsManager(supabaseServiceRole)).getMaxChargeableOWPerMonth(nowDay);

		console.info('api/admin/updatePrices', { now, nowDay, maxChargeableOWPerMonth });

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

		const pastReservations = reservations
			.filter(r => fromPanglaoDateTimeStringToDayJs(r.date, r.startTime) < now)
		const pastReservationsByUser = Object
			.groupBy(pastReservations, ({ user }) => user);

		const errors = [];
		for (const uRsvs of Object.values(pastReservationsByUser)) {
			const oldRsvs = uRsvs!.filter((rsv) => rsv.price != null);
			const newRsvs = uRsvs!.filter((rsv) => rsv.price == null);
			let numberOfAutoOW = oldRsvs.filter((rsv) =>
				rsv.resType === 'autonomous' && rsv.category === 'openwater').length;
			for (const rsv of newRsvs) {
				let price: number | undefined = undefined;
				const tmp = unpackTemplate(rsv);
				if (rsv.category === 'openwater' && rsv.resType === 'autonomous') {
					numberOfAutoOW++;
					if (numberOfAutoOW > maxChargeableOWPerMonth) {
						price = 0;
					} else {
						price = tmp[rsv.category][rsv.resType];
					}
				} else {
					const categoryPrice = tmp[rsv.category];
					if (!(rsv.resType in categoryPrice))
						throw Error(`assert ${rsv.id}: ${rsv.resType} !in ${categoryPrice}`);
					price = categoryPrice[rsv.resType] as number;
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
					errors.push(e);
					console_error(`error updating price`, e, rsv.id, price);
				}
			}
		}
		if (errors.length) {
			return new Response(`${JSON.stringify(errors)}`, { status: 500 });
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
