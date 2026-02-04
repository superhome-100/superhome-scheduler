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

export const getBuoys = async () => {
	const response = await fetch('/api/getBuoys');
	const resp = (await response.json()) as {
		status: 'success';
		buoys: Buoy[];
	} | {
		status: 'error';
		error: string;
	};
	if (resp.status === 'success') {
		return resp.buoys
	} else {
		console.error('getUsers', resp)
		return []
	}
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

		const resp = (await response.json()) as {
			status: 'success';
			usersById: {
				[uid: string]: UserMinimal;
			};
		} | {
			status: 'error';
			error: string;
		};
		if (resp.status === 'success') {
			return resp.usersById
		} else {
			console.error('getUsers', resp)
			return {}
		}
	} catch (error) {
		console.error(error);
		return {}
	}
};

export const getUserNotifications = async () => {
	const response = await fetch('/api/notifications');
	const resp = (await response.json()) as {
		status: 'success';
		notifications: Notification[];
	} | {
		status: 'error';
		error: string;
	};
	if (resp.status === 'success') {
		return resp.notifications
	} else {
		console.error('getUserNotifications', resp)
		return []
	}
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
