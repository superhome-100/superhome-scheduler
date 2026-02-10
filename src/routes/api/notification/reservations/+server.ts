import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import dayjs from 'dayjs';
import type { Reservation, ReservationCategory } from '$types';
import { getYYYYMMDD, PanglaoDayJs } from '$lib/datetimeUtils';

interface RequestBody {
	title: string;
	body: string;
	// filters
	happeningInTheNextHours: string;
	category?: string | null;
	owTime?: string | null;
}

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, 'admin');

		const { title,
			body,
			happeningInTheNextHours,
			category,
			owTime
		} = (await request.json()) as RequestBody;

		if (!title) throw Error('missing title');
		if (!body) throw Error('missing body');
		if (!happeningInTheNextHours) throw Error('missing happeningInTheNextHours');

		const from = PanglaoDayJs();
		const until = from.add(Number(happeningInTheNextHours), "hours");

		let query = supabaseServiceRole
			.from("Reservations")
			.select("*")
			.gte("date", getYYYYMMDD(from))
			.lte("date", getYYYYMMDD(until))
		if (category) {
			query = query.eq("category", category as ReservationCategory)
		}
		if (owTime) {
			query = query.eq("owTime", owTime)
		}
		type ResX = Reservation & { _dt: dayjs.Dayjs }
		const { data } = await query
			.overrideTypes<ResX[]>()
			.throwOnError();
		data.forEach(rsv => { rsv._dt = PanglaoDayJs(rsv.date + 'T' + rsv.startTime); });
		const matches = data.filter(r => from <= r._dt && r._dt <= until);

		const res = await Promise.all(matches.map(async (r) => {
			return await pushNotificationService.send(r.user, title, body);
		}));

		const resSum = res.flat().reduce((prev, curr) => {
			prev.success += curr.success; prev.failure += curr.failure; return prev
		}, { success: 0, failure: 0 })

		return json({
			status: 'success', data: resSum
		});
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error}` });
	}
}
