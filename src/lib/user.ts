import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase.types';

const signIn = async (
	supabase: SupabaseClient<Database>,
	provider: 'google' | 'facebook'
): Promise<{ error: AuthError | null }> => {
	try {
		const redirectTo = `${window.location.origin}/auth/callback`;
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo, queryParams: { prompt: 'select_account' } }
		});
		if (error) console.error('login failed', error);
		return { error };
	} catch (e) {
		const message = e instanceof Error ? e.message : `Sign-in failed: ${provider}`;
		console.error('login failed', message, e);
		return { error: e as AuthError };
	}
};

export const signInWithGoogle = async (
	supabase: SupabaseClient<Database>
): Promise<{ error: AuthError | null }> => signIn(supabase, 'google');


export const signInWithFacebook = async (
	supabase: SupabaseClient<Database>
): Promise<{ error: AuthError | null }> => signIn(supabase, 'facebook');


export const signOut = async (supabase: SupabaseClient<Database>): Promise<{ error: AuthError | null }> => {
	try {
		const { error } = await supabase.auth.signOut();
		if (error) throw error;

		// Redirect to login page
		if (typeof window !== 'undefined') {
			window.location.replace('/');
		}

		return { error: null };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Sign out failed';
		console.error('logout failed', message, e);
		return { error: e as AuthError };
	}
}
