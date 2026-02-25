import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { checkAuthorisation, supabaseServiceRole } from '$lib/server/supabase';
import { pushNotificationService } from '$lib/server/push';
import dayjs from 'dayjs';
import { OWTime, ReservationStatus, type Reservation, type ReservationCategory } from '$types';
import { fromPanglaoDateTimeStringToDayJs, getYYYYMMDD, PanglaoDayJs } from '$lib/datetimeUtils';
import { getSettingsManager } from '$lib/settings';

interface RequestBody {
	title: string;
	body: string;
	// filters
	happeningInTheNextHours: string;
	category?: string | null;
	owTime?: string | null;
}

export async function POST({ request, locals: { supabase, safeGetSession } }: RequestEvent) {
	try {
		const { user } = await safeGetSession();
		const sm = await getSettingsManager(supabase);
		checkAuthorisation(user, 'admin');

		const requestJson = (await request.json()) as RequestBody;
		const {
			title,
			body,
			happeningInTheNextHours,
			category,
			owTime
		} = requestJson;

		if (!title) throw Error('missing title');
		if (!body) throw Error('missing body');
		if (!happeningInTheNextHours) throw Error('missing happeningInTheNextHours');

		const from = PanglaoDayJs();
		const until = from.add(Number(happeningInTheNextHours), "hours");
		const fromStr = getYYYYMMDD(from);
		const untilStr = getYYYYMMDD(until);

		let query = supabaseServiceRole
			.from("Reservations")
			.select("*, Users(id, nickname)")
			.gte("date", fromStr)
			.lte("date", untilStr)
			.notIn("status", [ReservationStatus.canceled, ReservationStatus.rejected])
		if (category) {
			query = query.eq("category", category as ReservationCategory)
		}
		if (owTime) {
			query = query.eq("owTime", owTime as OWTime)
		}
		type ResX = Reservation & { _dt: dayjs.Dayjs }
		const { data } = await query
			.overrideTypes<ResX[]>()
			.throwOnError();
		data.forEach(rsv => { rsv._dt = fromPanglaoDateTimeStringToDayJs(rsv.date, rsv.startTime); });
		const matches = data.filter(r => from <= r._dt && r._dt <= until);

		const res = await Promise.all(matches.map(async (r) => {
			const res = await pushNotificationService.send(sm, r.user, title, body);
			return {
				...res, user: `${r.Users.nickname}(${r.Users.id})`
			}
		}));

		const resSum = res.reduce((prev, curr) => {
			if (curr.success > 0) {
				prev.notifiedUsers.push(curr.user);
			}
			prev.success += curr.success;
			prev.failure.push(...curr.failure);
			if (curr.success === 0) {
				prev.skippedUser.push(curr.user)
			}
			return prev;
		}, {
			notifiedUsers: [] as string[],
			success: 0,
			failure: [] as Error[],
			skippedUser: [] as string[]
		})

		console.info('api/notification/reservations sent', requestJson, { from, until }, resSum);

		return json({
			status: 'success', data: resSum
		});
	} catch (error) {
		return json({ status: 'error', error: error instanceof Error ? error.message : `${error} ` });
	}
}
