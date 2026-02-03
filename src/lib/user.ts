import type { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { loginState, user as userStore, authStore } from '$lib/stores';
import type { Database } from '$lib/supabase.types';
import type { UserEx } from '$types';

// Ensure a user profile exists for the current session user
export async function ensureUserProfile(user: UserEx | null): Promise<UserEx | null> {
	try {
		if (!user) {
			userStore.set(null);
			authStore.set({ loading: false, error: null });
			loginState.set('out');
			return null;
		} else {
			userStore.set(user);
			authStore.set({ loading: false, error: null });
			loginState.set('in');
		}
		return user;
	} catch (err) {
		console.error('Error ensuring user profile:', err);
		return null;
	}
}

const signIn = async (
	supabase: SupabaseClient<Database>,
	provider: 'google' | 'facebook'
): Promise<{ error: AuthError | null }> => {
	authStore.update(s => ({ ...s, loading: true }))
	try {
		const redirectTo = `${window.location.origin}/auth/callback`;
		const { error } = await supabase.auth.signInWithOAuth({
			provider,
			options: { redirectTo, queryParams: { prompt: 'select_account' } }
		});
		if (error) authStore.update((s) => ({ ...s, error: error.message }));
		return { error };
	} catch (e) {
		const message = e instanceof Error ? e.message : `Sign-in failed: ${provider}`;
		authStore.update((s) => ({ ...s, error: message }));
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
		await ensureUserProfile(null);

		// Redirect to login page
		if (typeof window !== 'undefined') {
			window.location.replace('/');
		}

		return { error: null };
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Sign out failed';
		authStore.update((s) => ({ ...s, error: message }));
		return { error: e as AuthError };
	}
}
