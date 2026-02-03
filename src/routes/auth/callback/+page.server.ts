import { redirect } from '@sveltejs/kit';

export const load = async ({ locals: { supabase }, url }) => {
	const code = url.searchParams.get('code');
	if (!code) {
		throw redirect(303, '/login');
	}
	const { error } = await supabase.auth.exchangeCodeForSession(code);
	if (error) {
		throw redirect(303, '/login');
	}
	throw redirect(303, '/');
};
