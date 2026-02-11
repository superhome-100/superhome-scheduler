import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { user } }) => {
    if (user) redirect(303, '/');
};
