import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { safeGetSession } }) => {
    const { user } = await safeGetSession();
    if (user) redirect(303, '/');
};
