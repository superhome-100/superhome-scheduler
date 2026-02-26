import { redirect } from "@sveltejs/kit";

export const load = async ({ locals }) => {
    const { user } = await locals.safeGetSession();
    if (user?.privileges !== 'admin') {
        redirect(303, '/');
    }
};
