import {
	type Buoy,
	type Reservation,
	type ReservationCategory,
	type DateReservationSummary,
	type BuoyGrouping,
	type ReservationWithUser,
	type UserMinimal
} from '$types';
import { getYYYYMMDD } from './datetimeUtils';
import type { Tables } from './supabase.types';

export const getBuoys = async () => {
	const response = await fetch('/api/getBuoys');
	const data = (await response.json()) as {
		status: 'success' | 'error';
		buoys: Buoy[];
	};
	return data;
};

export const getBoatAssignmentsByDate = async (date: string) => {
	const response = await fetch(`/api/ow/${date}/boat-assignments`);

	const data = (await response.json()) as {
		status: 'success' | 'error';
		assignments?: {
			[key: string]: string;
		};
		error?: string;
	};

	return data;
};

export const getUserPastReservations = async (maxDateStr: string) => {
	const response = await fetch('/api/getUserPastReservations', {
		method: 'POST',
		body: JSON.stringify({ maxDateStr })
	});
	let data = (await response.json()) as {
		status: 'success' | 'error';
		userPastReservations?: Reservation[];
		error?: string;
	};
	return data;
};

export const getIncomingReservations = async () => {
	const response = await fetch('/api/users/reservations');
	const data = (await response.json()) as {
		status: 'success' | 'error';
		reservations?: Reservation[];
		error?: string;
	};
	return data;
};

export const getUsers = async () => {
	try {
		const response = await fetch('/api/getUsers');

		const data = (await response.json()) as {
			status: 'success' | 'error';
			usersById?: {
				[uid: string]: UserMinimal;
			};
			error?: string;
		};
		return data;
	} catch (error) {
		console.error(error);
	}
};

export const getUserNotifications = async () => {
	const response = await fetch('/api/notifications');
	const notifications = (await response.json()) as Notification[];
	return notifications;
};

export const getOWAdminComments = async (date: string) => {
	const response = await fetch(`/api/ow/${date}/admin-comments`);

	let adminComments: BuoyGrouping[] = [];
	try {
		const res = await response.json();
		if (res.message) {
			throw new Error(res.message);
		} else {
			adminComments = res as BuoyGrouping[];
		}
	} catch (error) {
		console.error('getOWAdminComments: error getting admin ow comments', error);
	}
	return adminComments;
};

export const getReservationsByDate = async (date: string, category: ReservationCategory) => {
	const response = await fetch('/api/getReservationsByDate', {
		method: 'POST',
		body: JSON.stringify({ date, category })
	});
	let data = (await response.json()) as {
		status: 'success' | 'error';
		reservations?: ReservationWithUser[];
		error?: string;
	};
	return data;
};

export const getReservationSummary = async (startDate: Date, endDate: Date) => {
	try {
		const response = await fetch(
			`/api/reports/reservations?startDate=${getYYYYMMDD(startDate)}&endDate=${getYYYYMMDD(
				endDate
			)}`
		);

		let data = (await response.json()) as
			| {
				status: 'error';
				error: string;
			}
			| {
				status: 'success';
				summary: Record<string, DateReservationSummary>;
			};
		return data;
	} catch (error) {
		console.error('getReservationSummary: error getting reservation summary', error);
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
