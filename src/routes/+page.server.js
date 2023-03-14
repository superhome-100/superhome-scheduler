import { submitReservation } from '$lib/server/server.js';

export const actions = {
    submitReservation: async ({ request }) => {
        const data = await request.formData();
        const record = await submitReservation(data);
        return record;
    }
}

