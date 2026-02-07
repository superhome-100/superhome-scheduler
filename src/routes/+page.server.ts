import type { ActionFailure, Actions } from '@sveltejs/kit';
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
import type { RequestEvent } from '@sveltejs/kit';
import { AuthError, checkAuthorisation } from '$lib/server/supabase';
import type { OWTime } from '$types';
import { console_error } from '$lib/server/sentry';

const adminUpdateGeneric = async ({
	request,
	locals: { user }
}: RequestEvent): Promise<void | ActionFailure<{ error: string }>> => {
	try {
		checkAuthorisation(user, 'admin');
		const data = await request.formData();
		console.log('adminUpdateGeneric', data);
		const category = data.get('category') as string;
		await doTransaction(category, data.get('date') as string, async () => {
			await adminUpdate(user, data);
		});
	} catch (e) {
		console_error('error adminUpdateGeneric', e);
		if (e instanceof AuthError) {
			return fail(e.code, { error: e.message });
		} if (e instanceof ValidationError) {
			return fail(400, { error: e.message });
		} else if (e instanceof Error) {
			return fail(500, { error: e.message });
		} else {
			throw e;
		}
	}
};

export const actions: Actions = {
	submitReservation: async ({ request, locals: { settings, user } }: RequestEvent) => {
		try {
			checkAuthorisation(user);
			const data = await request.formData();
			const category = data.get('category') as string;
			await doTransaction(category, data.get('date') as string, async () => {
				await submitReservation(user, data, settings);
			});
		} catch (e) {
			console_error('error submitReservation', e);
			if (e instanceof AuthError) {
				return fail(e.code, { error: e.message });
			} if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else if (e instanceof Error) {
				return fail(500, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	modifyReservation: async ({ request, locals: { user, settings } }: RequestEvent) => {
		try {
			checkAuthorisation(user);
			const data = await request.formData();
			const category = data.get('category') as string;
			await doTransaction(category, data.get('date') as string, async () => {
				return await modifyReservation(user, data, settings);
			});
		} catch (e) {
			console_error('error modifyReservation', e);
			if (e instanceof AuthError) {
				return fail(e.code, { error: e.message });
			} else if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else if (e instanceof Error) {
				return fail(500, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	cancelReservation: async ({ request, locals: { user, settings } }: RequestEvent) => {
		try {
			checkAuthorisation(user);
			const data = await request.formData();
			console.log('cancelReservation', data);
			const category = data.get('category') as string;
			await doTransaction(category, data.get('date') as string, async () => {
				await cancelReservation(user, data, settings);
			});
		} catch (e) {
			console_error('error cancelReservation', e);
			if (e instanceof AuthError) {
				return fail(e.code, { error: e.message });
			} if (e instanceof ValidationError) {
				return fail(400, { error: e.message });
			} else if (e instanceof Error) {
				return fail(500, { error: e.message });
			} else {
				throw e;
			}
		}
	},
	adminUpdateConfirmed: adminUpdateGeneric,
	adminUpdatePending: adminUpdateGeneric,
	adminUpdateRejected: adminUpdateGeneric,
	nickname: async ({ request, locals: { user } }: RequestEvent) => {
		checkAuthorisation(user, 'admin');
		const data = await request.formData();
		const record = await updateNickname(data.get('id') as string, data.get('nickname') as string);
		return record;
	},
	submitReceipt: async ({ request, locals: { user } }: RequestEvent) => {
		// notification related
		checkAuthorisation(user);
		const data = await request.formData();
		const { notificationId, accept } = Object.fromEntries(data);
		if (accept === 'on') {
			await insertNotificationReceipt(notificationId as string, user.id);
		}
	},
	adminCommentUpdate: async ({ request, locals: { user } }: RequestEvent) => {
		checkAuthorisation(user, 'admin');
		const data = await request.formData();
		const adminComment = data.get('admin_comments') as string;
		const record = await upsertOWReservationAdminComments({
			comment: adminComment,
			date: data.get('date') as string,
			buoy: data.get('buoy') as string,
			am_pm: data.get('owTime') as OWTime
		});
		return { record };
	}
};
