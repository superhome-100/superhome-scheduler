import {
    submitReservation,
    updateReservation,
    cancelReservation,
    adminUpdate,
    updateNickname,
    insertNotificationReceipt,
} from '$lib/server/server.js';

const adminUpdateGeneric = async ({ request }) => {
    const data = await request.formData();
    const record = await adminUpdate(data);
    return record;
};

export const actions = {
    submitReservation: async ({ request }) => {
        const data = await request.formData();
        const record = await submitReservation(data);
        return record;
    },
    updateReservation: async ({ request }) => {
        const data = await request.formData();
        try {
            const record = await updateReservation(data);
            return record;
        } catch (error) {
            console.error(error)
            return error;
        }
    },
    cancelReservation: async ({ request }) => {
        const data = await request.formData();
        const record = await cancelReservation(data);
        return record;
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
    },
}

