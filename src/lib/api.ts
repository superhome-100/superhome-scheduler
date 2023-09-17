import type { UsersRecord } from './server/xata.codegen';

// TODO: fix this type
export const getBuoys = async () => {
	const response = await fetch('/api/getBuoys');
	const data = (await response.json()) as {
		status: 'success' | 'error';
		buoys: any[];
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

export const getBoatAssignments = async () => {
	const response = await fetch('/api/getBoatAssignments');

	const data = (await response.json()) as {
		status: 'success' | 'error';
		assignments?: {
			[key: string]: any;
		};
		error?: string;
	};

	return data;
};

export const getUserPastReservations = async (uid: string, maxDateStr: string) => {
	const response = await fetch('/api/getUserPastReservations', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({ user: uid, maxDateStr })
	});
	let data = (await response.json()) as {
		status: 'success' | 'error';
		userPastReservations?: any[];
		error?: string;
	};
	return data;
};

export const getAppData = async (minDateStr: string) => {
	const response = await fetch('/api/getAppData', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({ minDateStr })
	});

	const data = (await response.json()) as {
		status: 'success' | 'error';
		reservations?: any[];
		usersById?: {
			[uid: string]: UsersRecord;
		};
		error?: string;
	};
	return data;
};

// TODO: fix types
export const getUserNotifications = async () => {
	const response = await fetch('/api/notifications');
	const notifications = (await response.json()) as any[];
	return notifications;
};
