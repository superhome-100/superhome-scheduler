import { submitReservation } from '$lib/server/server.js';

export const actions = {
    submitReservation: async ({ request }) => {
        const data = await request.formData();
        submitReservation(data);
    }
}

