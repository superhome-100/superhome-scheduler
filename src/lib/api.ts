import {
	type ReservationCategory,
	type DateReservationSummary,
	type UserMinimal,
	type SupabaseClient,
	ReservationStatus,
	type User
} from '$types';
import type { Dayjs } from 'dayjs';
import { dayjs } from './datetimeUtils';
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
			.throwOnError();
		if (data.length == 0 || !data[0].assignments) return {};
		return JSON.parse(data[0].assignments);
	} catch (error) {
		console.error(error);
		return {}
	}
};

export const getUserPastReservations = async (user: User, supabase: SupabaseClient, maxDateStr: string) => {
	try {
		const { data } = await supabase
			.from('Reservations')
			.select('*')
			.eq('user', user.id)
			.lte('date', maxDateStr)
			.eq('status', ReservationStatus.confirmed)
			.throwOnError();
		return data;
	} catch (error) {
		console.error(error);
		return []
	}
};

export const getIncomingReservations = async (user: User, supabase: SupabaseClient) => {
	try {
		const daysLimit = 60;
		const now = dayjs().tz('Asia/Manila');
		const inXDays = now.clone().add(daysLimit, 'days');

		const dateArray = [];
		let currentDate: Dayjs = now;

		while (currentDate.isBefore(inXDays)) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const { data } = await supabase
			.from('Reservations')
			.select('*')
			.eq('user', user.id)
			.gte('date', now.format('YYYY-MM-DD'))
			.lt('date', inXDays.format('YYYY-MM-DD'))
			.in("status", [ReservationStatus.confirmed, ReservationStatus.pending])
			.throwOnError();

		return data;
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
			.from('Reservations')
			.select('*, Users(nickname)')
			.eq('date', date)
			.in('status', [ReservationStatus.confirmed, ReservationStatus.pending])
			.throwOnError();
		return rawRsvs;
	} catch (error) {
		console.error(error);
		return [];
	}
};

export const getReservationSummary = async (supabase: SupabaseClient, startDate: Date, endDate: Date) => {
	try {
		const dateArray = [];
		let currentDate: Dayjs = dayjs(startDate);

		while (currentDate.isBefore(dayjs(endDate).add(1, 'day'))) {
			dateArray.push(currentDate.format('YYYY-MM-DD'));
			currentDate = currentDate.add(1, 'day');
		}

		const startStr = dayjs(startDate).format('YYYY-MM-DD')
		const endStr = dayjs(endDate).format('YYYY-MM-DD')

		const { data: reservations } = await supabase
			.from('ReservationsReport')
			.select('*')
			.gte('date', startStr)
			.lte('date', endStr)
			.throwOnError()

		const { data: daySettings } = await supabase
			.from('DaySettings')
			.select('date, value')
			.gte('date', startStr)
			.lte('date', endStr)
			.eq('key', ow_am_full)
			.throwOnError()

		const summary: Record<string, DateReservationSummary> = {};

		for (const date of dateArray) {
			summary[date] = {
				pool: 0,
				openwater: {
					AM: 0,
					PM: 0,
					total: 0,
					ow_am_full: false
				},
				classroom: 0,
			};
		}

		for (const reservation of reservations) {
			const date = reservation.date!;
			const category = reservation.category!;
			const owTime = reservation.owTime;
			const count = reservation.count!;
			if (!date) continue;

			const day = summary[date];
			if (!day) continue;

			if (category === 'pool') {
				day.pool += count;
			} else if (category === 'classroom') {
				day.classroom += count;
			} else if (category === 'openwater') {
				if (owTime === 'AM') {
					day.openwater.AM += count;
				} else if (owTime === 'PM') {
					day.openwater.PM += count;
				}
				day.openwater.total += count;
			}
		}

		for (const daySetting of daySettings) {
			summary[daySetting.date].openwater.ow_am_full = daySetting.value === true;
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

export async function flagOWAmAsFull(date: string, state: boolean) {
	await fetch(`/api/admin/setting/${date}/${ow_am_full}/set`, {
		method: 'PUT',
		body: JSON.stringify(state)
	});
}

export async function lockBuoyAssignments(day: string, lock: boolean) {
	const response = await fetch('/api/lockBuoyAssignments', {
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
