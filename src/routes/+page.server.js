import {
	submitReservation,
	modifyReservation,
	cancelReservation,
	adminUpdate
} from '$lib/server/reservation';
import { insertNotificationReceipt } from '$lib/server/server.js';
import { ValidationError } from '$utils/validation';
import { fail } from '@sveltejs/kit';
import { updateNickname } from '$lib/server/user';

const adminUpdateGeneric = async ({ request }) => {
	const data = await request.formData();
	const record = await adminUpdate(data);
	return record;
};

export const actions = {
	submitReservation: async ({ request }) => {
		try {
			const data = await request.formData();
			const record = await submitReservation(data);
			return record;
		} catch (e) {
			if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	modifyReservation: async ({ request }) => {
		const data = await request.formData();
		try {
			const record = await modifyReservation(data);
			return record;
		} catch (e) {
			if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	cancelReservation: async ({ request }) => {
		try {
			const data = await request.formData();
			const record = await cancelReservation(data);
			return record;
		} catch (e) {
			if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	adminUpdateConfirmed: adminUpdateGeneric,
	adminUpdatePending: adminUpdateGeneric,
	adminUpdateRejected: adminUpdateGeneric,
	nickname: async ({ request }) => {
		const data = await request.formData();
		const record = await updateNickname(data.get('id'), data.get('nickname'));
		return record;
	},
	submitReceipt: async ({ request }) => {
		const data = await request.formData();
		const { notificationId, userId, accept } = Object.fromEntries(data);
		if (accept === 'on') {
			await insertNotificationReceipt(notificationId, userId);
		}
	}
};
