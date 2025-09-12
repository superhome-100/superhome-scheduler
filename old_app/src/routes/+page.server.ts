import type { Actions } from '@sveltejs/kit';
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
import { doTransaction } from '$lib/server/firestore';
import { approveAllPendingReservations } from '$lib/server/reservation';

interface AdminUpdateResult {
	record: any;
}

const adminUpdateGeneric = async ({ request }: { request: Request }): Promise<AdminUpdateResult> => {
	const data = await request.formData();
	console.log('adminUpdateGeneric', data);
	const category = data.get('category') as string;
	let record;
	await doTransaction(category, data.get('date') as string, async () => {
		record = await adminUpdate(data);
	});
	return { record };
};

export const actions: Actions = {
	submitReservation: async ({ request }) => {
		try {
			const data = await request.formData();
			const category = data.get('category') as string;
			let record;

			await doTransaction(category, data.get('date') as string, async () => {
				record = await submitReservation(data);
			});

			return record;
		} catch (e) {
			console.error('error submitReservation', e);
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
			const category = data.get('category') as string;
			let record;
			await doTransaction(category, data.get('date') as string, async () => {
				record = await modifyReservation(data);
			});
			return record;
		} catch (e) {
			console.error('error modifyReservation', e);
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
			console.log('cancelReservation', data);
			const category = data.get('category') as string;
			let record;
			await doTransaction(category, data.get('date') as string, async () => {
				record = await cancelReservation(data);
			});
			return record;
		} catch (e) {
			console.error('error cancelReservation', e);
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
		const record = await updateNickname(data.get('id') as string, data.get('nickname') as string);
		return record;
	},
	submitReceipt: async ({ request }) => {
		const data = await request.formData();
		const { notificationId, userId, accept } = Object.fromEntries(data);
		if (accept === 'on') {
			await insertNotificationReceipt(notificationId, userId);
		}
	},
	adminCommentUpdate: async ({ request }) => {
		const data = await request.formData();
		const adminComment = data.get('admin_comments') as string;
		const record = await upsertOWReservationAdminComments({
			comment: adminComment,
			date: data.get('date') as string,
			buoy: data.get('buoy') as string,
			am_pm: data.get('owTime') as string
		});
		return { record };
	}
};