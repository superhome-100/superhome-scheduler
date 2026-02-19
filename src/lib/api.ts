import {
	type ReservationCategory,
	type DateReservationSummary,
	type UserMinimal,
	type SupabaseClient,
	ReservationStatus,
	type User,
	type ReservationEx,
	type DateReservationReport
} from '$types';
import type { Dayjs } from 'dayjs';
import { fromPanglaoDateTimeStringToDayJs, getYYYYMMDD, PanglaoDayJs } from './datetimeUtils';
import { ow_am_full } from './dateSettings';

export const getBuoys = async (supabase: SupabaseClient) => {
	try {
		const { data } = await supabase
			.from('Buoys')
			.select('*')
			.throwOnError();
		return data;
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getBoatAssignmentsByDate = async (supabase: SupabaseClient, date: string): Promise<Record<string, string>> => {
	try {
		const { data } = await supabase
			.from('Boats')
			.select('*')
			.eq('id', date)
			.maybeSingle()
			.throwOnError();
		return data?.assignments as Record<string, string> ?? {};
	} catch (error) {
		console.error(error);
		return {}
	}
};

export const getUserPastReservations = async (user: User, supabase: SupabaseClient, maxDateStr: string) => {
	try {
		const now = PanglaoDayJs();

		const { data } = await supabase
			.from('ReservationsEx')
			.select('*')
			.eq('user', user.id)
			.lte('date', maxDateStr)
			.eq('status', ReservationStatus.confirmed)
			.overrideTypes<ReservationEx[]>()
			.throwOnError();

		return data.filter(r => fromPanglaoDateTimeStringToDayJs(r.date, r.startTime) < now);
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getIncomingReservations = async (user: User, supabase: SupabaseClient) => {
	try {
		const daysLimit = 60;
		const now = PanglaoDayJs();
		const inXDays = now.clone().add(daysLimit, 'days');

		const dateArray = [];
		let currentDate: Dayjs = now;

		while (currentDate.isBefore(inXDays)) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const { data } = await supabase
			.from('ReservationsEx')
			.select('*')
			.eq('user', user.id)
			.gte('date', now.format('YYYY-MM-DD'))
			.lt('date', inXDays.format('YYYY-MM-DD'))
			.in("status", [ReservationStatus.confirmed, ReservationStatus.pending])
			.overrideTypes<ReservationEx[]>()
			.throwOnError();

		return data.filter(r => now <= fromPanglaoDateTimeStringToDayJs(r.date, r.startTime));
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getUsers = async (supabase: SupabaseClient) => {
	try {
		const { data } = await supabase
			.rpc('get_users_minimal')
			.select("*")
			.throwOnError();
		const users = data as UserMinimal[]
		const usersById = users.reduce((obj, user) => {
			obj[user.id!] = user;
			return obj;
		}, {} as { [uid: string]: UserMinimal });
		return usersById;
	} catch (error) {
		console.error(error);
		return {}
	}
};

export const getUserNotifications = async (supabase: SupabaseClient) => {
	try {
		const { data } = await supabase
			.rpc("get_user_unread_notifications")
			.throwOnError();
		return data;
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getOWAdminComments = async (supabase: SupabaseClient, date: string) => {
	try {
		const { data } = await supabase
			.from('BuoyGroupings')
			.select('*')
			.eq('date', date)
			.throwOnError();
		return data;
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getReservationsByDate = async (supabase: SupabaseClient, date: string) => {
	try {
		const { data: rawRsvs } = await supabase
			.from('ReservationsEx')
			.select('*')
			.eq('date', date)
			.in('status', [ReservationStatus.confirmed, ReservationStatus.pending])
			.overrideTypes<ReservationEx[]>()
			.throwOnError();
		return rawRsvs;
	} catch (error) {
		console.error(error);
		return [];
	}
};

export const getReservationSummary = async (supabase: SupabaseClient, startDate: Date, endDate: Date) => {
	try {
		const startDj = PanglaoDayJs(startDate);
		const endDj = PanglaoDayJs(endDate);
		const numOfDays = endDj.diff(startDj, 'days') + 1;
		const dateArray = Array.from({ length: numOfDays }).map((_, i) => getYYYYMMDD(startDj.add(i, 'days')));

		const startStr = getYYYYMMDD(startDj)
		const endStr = getYYYYMMDD(endDj)

		const { data: reservations } = await supabase
			.from('ReservationsReport')
			.select('*')
			.gte('date', startStr)
			.lte('date', endStr)
			.overrideTypes<DateReservationReport[]>()
			.throwOnError()

		const summary: Record<string, DateReservationSummary> = {};

		for (const reservation of reservations) {
			const date = reservation.date!;
			if (!date) continue;
			summary[date] = reservation.summary;
		}

		for (const dayStr of dateArray) {
			if (summary[dayStr] === undefined) {
				summary[dayStr] = {
					pool: 0,
					openwater: {
						AM: 0,
						PM: 0,
						ow_am_full: false
					},
					classroom: 0,
				};
			}
		}

		return summary;
	} catch (error) {
		console.error('getReservationSummary: error getting reservation summary', error);
		return {};
	}
};

export const approveAllPendingReservations = async (
	category: ReservationCategory,
	date: string
) => {
	await fetch('/api/admin/approveAll', {
		method: 'POST',
		body: JSON.stringify({ category, date })
	});
};

export async function flagOWAmAsFull(supabase: SupabaseClient, date: string, state: boolean) {
	try {
		const key = 'ow_am_full';
		await supabase
			.from("DaySettings")
			.upsert({ date, key, value: state })
			.eq("date", date)
			.eq("key", key)
			.throwOnError();
	} catch (error) {
		console.error('flagOWAmAsFull', error, date, state);
	}
}

export async function lockBuoyAssignments(day: string, lock: boolean) {
	const response = await fetch('/api/admin/lockBuoyAssignments', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({
			lock,
			date: day
		})
	});
	let data = await response.json();
	if (data.status !== 'success') {
		console.error(data.error);
		throw Error(data.error);
	}
}

export async function assignBuoysToBoats(date: string, assignments: Record<string, string>) {
	let response = await fetch('/api/admin/assignBuoysToBoats', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({ date, assignments })
	});
	let data = await response.json();
	if (data.status !== 'success') {
		console.error('saveAssignments', data);
	}
}