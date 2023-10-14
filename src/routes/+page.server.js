import {
	submitReservation,
	modifyReservation,
	cancelReservation,
	adminUpdate
} from '$lib/server/reservation';
import { insertNotificationReceipt } from '$lib/server/server';
import { ValidationError } from '$utils/validation';
import { fail } from '@sveltejs/kit';
import { updateNickname } from '$lib/server/user';
import { upsertOWReservationAdminComments } from '$lib/server/ow';

const adminUpdateGeneric = async ({ request }) => {
	const data = await request.formData();
	console.log(data);
	const record = await adminUpdate(data);

	const adminComment = data.get('admin_comments');
	if (adminComment) {
		await upsertOWReservationAdminComments({
			comment: adminComment,
			date: data.get('date'),
			buoy: data.get('buoy'),
			am_pm: data.get('owTime')
		});
	}
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
