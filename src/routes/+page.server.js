import {
    submitReservation,
    updateReservation,
    cancelReservation,
    adminUpdate,
    updateNickname,
} from '$lib/server/server.js';

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
    adminUpdateConfirmed: async ({ request }) => {
        const data = await request.formData();
        data.set('status', 'confirmed');
        const record = await adminUpdate(data);
        return record;
    },
    adminUpdatePending: async ({ request }) => {
        const data = await request.formData();
        data.set('status', 'pending');
        const record = await adminUpdate(data);
        return record;
    },adminUpdateRejected: async ({ request }) => {
        const data = await request.formData();
        data.set('status', 'rejected');
        const record = await adminUpdate(data);
        return record;
    },
    nickname: async ({ request }) => {
        const data = await request.formData();
        const record = await updateNickname(data.get('id'), data.get('nickname'));
        return record;
    },
}

