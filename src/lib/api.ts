import type { Buoy, Reservation, ReservationCategory, DateReservationSummary } from '$types';
import type { UsersRecord, BuoyGroupings } from './server/xata.codegen';
import { auth } from '$lib/firebase';
import axios from 'axios';
import { getYYYYMMDD } from './datetimeUtils';
// TODO: fix this type
export const getBuoys = async () => {
	const response = await fetch('/api/getBuoys');
	const data = (await response.json()) as {
		status: 'success' | 'error';
		buoys: Buoy[];
	};
	return data;
};

// TODO: fix types
export const getSession = async () => {
	const response = await fetch('/api/getSession');

	const data = (await response.json()) as {
		status: 'success' | 'error';
		photoURL?: string;
		user?: UsersRecord;
		viewMode?: string;
		error?: string;
	};

	return data;
};

export const getBoatAssignmentsByDate = async (date: string) => {
	const response = await fetch(`/api/ow/${date}/boat-assignments`);

	const data = (await response.json()) as {
		status: 'success' | 'error';
		assignments?: {
			[key: string]: any;
		};
		error?: string;
	};

	return data;
};

export const getUserPastReservations = async (maxDateStr: string) => {
	const token = await auth.currentUser?.getIdToken();
	const response = await fetch('/api/getUserPastReservations', {
		method: 'POST',
		headers: {
			'Content-type': 'application/json',
			Authorization: 'Bearer ' + token
		},
		body: JSON.stringify({ maxDateStr })
	});
	let data = (await response.json()) as {
		status: 'success' | 'error';
		userPastReservations?: any[];
		error?: string;
	};
	return data;
};

export const getIncomingReservations = async () => {
	const token = await auth.currentUser?.getIdToken();
	const response = await fetch('/api/users/reservations', {
		headers: {
			Authorization: 'Bearer ' + token
		}
	});
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
				[uid: string]: UsersRecord;
			};
			error?: string;
		};
		return data;
	} catch (error) {
		console.error(error);
	}
};

// TODO: fix types
export const getUserNotifications = async () => {
	const response = await fetch('/api/notifications');
	const notifications = (await response.json()) as any[];
	return notifications;
};

export const getOWAdminComments = async (date: string) => {
	const response = await fetch(`/api/ow/${date}/admin-comments`);

	let adminComments: BuoyGroupings[] = [];
	try {
		const res = await response.json();
		if (res.message) {
			throw new Error(res.message);
		} else {
			adminComments = res as BuoyGroupings[];
		}
	} catch (error) {
		console.error('getOWAdminComments: error getting admin ow comments', error);
	}
	return adminComments;
};

export const getReservationsByDate = async (date: string, category: ReservationCategory) => {
	const token = await auth.currentUser?.getIdToken();
	const response = await fetch('/api/getReservationsByDate', {
		method: 'POST',
		headers: {
			'Content-type': 'application/json',
			Authorization: 'Bearer ' + token
		},
		body: JSON.stringify({ date, category })
	});
	let data = (await response.json()) as {
		status: 'success' | 'error';
		reservations?: Reservation[];
		error?: string;
	};
	return data;
};

export const getReservationSummary = async (startDate: Date, endDate: Date) => {
	const token = await auth.currentUser?.getIdToken();
	try {
		if (token) {
			const response = await axios.get(`/api/reports/reservations`, {
				params: {
					startDate: getYYYYMMDD(startDate),
					endDate: getYYYYMMDD(endDate)
				},
				headers: {
					'Content-type': 'application/json',
					Authorization: 'Bearer ' + token
				}
			});

			let data = response.data as
				| {
						status: 'error';
						error: string;
				  }
				| {
						status: 'success';
						summary: Record<string, DateReservationSummary>;
				  };
			return data;
		}
	} catch (error) {
		console.error('getReservationSummary: error getting reservation summary', error);
	}
};
