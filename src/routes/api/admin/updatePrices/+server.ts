import type { RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	fromPanglaoDateTimeStringToDayJs,
	PanglaoDayJs,
	getYYYYMMDD
} from '$lib/datetimeUtils';
import { AuthError, checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { ReservationStatus, type ReservationWithPrices } from '$types';
import { console_error } from '$lib/server/sentry';
import { getSettingsManager } from '$lib/settings';
import { getPriceForReservation } from '$utils/reservations';



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
export async function GET({ request, locals: { safeGetSession } }: RequestEvent) {
	try {
		try {
			const { user } = await safeGetSession();
			checkAuthorisation(user, 'admin');
		} catch {
			const authHeader = request.headers.get('X-Cron-Secret');
			if (authHeader !== env.PRIVATE_CRON_SECRET) {
				console_error('api/admin/updatePrices', new Error('secret error'));
				return new Response('Unauthorized', { status: 401 });
			}
		}

		const now = PanglaoDayJs()
		const nowDay = getYYYYMMDD(now);
		const firstOfMonth = getYYYYMMDD(new Date(now.year(), now.month()))
		// need to use supabaseServiceRole because this code run from scheduled worker without user so 
		// `locals:{supabase}` is not working here
		const settings = await getSettingsManager(supabaseServiceRole)
		const maxChargeableOWPerMonth = settings.getMaxChargeableOWPerMonth(nowDay);

		console.info('api/admin/updatePrices', { now, nowDay, maxChargeableOWPerMonth });

		const { data: reservations } = await supabaseServiceRole
			.from('ReservationsWithPrices')
			.select('*')
			.gte('date', firstOfMonth)
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
			let numberOfAutoOW = 0;
			for (const rsv of uRsvs!) {
				if (rsv.category === 'openwater' && rsv.resType === 'autonomous') {
					numberOfAutoOW++;
				}
				if (rsv.price !== null) {
					continue;
				}
				let price = getPriceForReservation(rsv, rsv.priceTemplate);
				if (rsv.category === 'openwater'
					&& rsv.resType === 'autonomous'
					&& numberOfAutoOW > maxChargeableOWPerMonth) {
					price = 0;
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
