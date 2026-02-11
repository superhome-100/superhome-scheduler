import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { supabase }, url }) => {
	const code = url.searchParams.get('code');
	if (!code) {
		redirect(303, '/login');
	}
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		redirect(303, '/login');
	}
	redirect(303, '/');
};
