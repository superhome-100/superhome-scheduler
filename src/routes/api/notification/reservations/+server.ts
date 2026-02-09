import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import dayjs from 'dayjs';
import type { Reservation } from '$types';
import { getYYYYMMDD } from '$lib/datetimeUtils';

interface RequestBody {
	title: string;
	body: string;
	// filters
	happeningInTheNextHours: string;
	category?: string;
	owTime?: string;
}

export async function POST({ request, locals: { user } }: RequestEvent) {
	try {
		checkAuthorisation(user, 'admin');

		const { title, body, happeningInTheNextHours, category, owTime } = (await request.json()) as RequestBody;

		const from = dayjs();
		const until = from.add(Number(happeningInTheNextHours), "hours");

		let query = supabaseServiceRole
			.from("Reservations")
			.select("*")
			.gte("date", getYYYYMMDD(from))
			.lte("date", getYYYYMMDD(until))
		if (category) {
			query = query.eq("category", category)
		}
		if (owTime) {
			query = query.eq("owTime", owTime)
		}
		type ResX = Reservation & { _dt: dayjs.Dayjs }
		const { data } = await query
			.overrideTypes<ResX[]>()
			.throwOnError();
		data.forEach(rsv => { rsv._dt = dayjs(rsv.date + 'T' + rsv.startTime); });
		const matches = data.filter(r => from <= r._dt && r._dt <= until);

		const res = await Promise.allSettled(matches.map(async (r) => {
			return await pushNotificationService.send(r.user, title, body);
		}));

		return json({
			status: 'success', data: {
				success: res.filter(r => r.status === 'fulfilled').length,
				failed: res.filter(r => r.status === 'rejected').length,
			}
		});
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error}` });
	}
}
