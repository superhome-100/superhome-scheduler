import { writable } from 'svelte/store';
import { supabase } from '../utils/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export const authStore = writable<AuthState>({ user: null, loading: false, error: null });

// Ensure a user profile exists for the current session user
async function ensureUserProfile(user: User | null): Promise<void> {
  try {
    if (!user) return;
    const uid = user.id;
    // Upsert minimal profile
    await supabase
      .from('user_profiles')
      .upsert(
        {
          uid,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
          // status and privileges use defaults from DB
          updated_at: new Date().toISOString()
        },
        { onConflict: 'uid' }
      );
  } catch (_) {
    // Ignore silently; RLS/policies protect rows
  }
}

// Minimal auth init: keep user in a small store for UI convenience
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user ?? null;
  authStore.set({ user, loading: false, error: null });
  // Best-effort profile ensure on state changes
  ensureUserProfile(user);
});

// Populate initial session on first load
(async () => {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    authStore.set({ user, loading: false, error: null });
    await ensureUserProfile(user);
  } catch (_) {
    authStore.set({ user: null, loading: false, error: null });
  }
})();

export const auth = {
  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) authStore.update(s => ({ ...s, error: error.message }));
      return { error };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Google sign-in failed';
      authStore.update(s => ({ ...s, error: message }));
      return { error: e as AuthError };
    }
  },

  async signInWithFacebook(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (error) authStore.update(s => ({ ...s, error: error.message }));
      return { error };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Facebook sign-in failed';
      authStore.update(s => ({ ...s, error: message }));
      return { error: e as AuthError };
    }
  },

  // Role check: direct DB read from user_profiles (no custom claims)
  async isAdmin(): Promise<boolean> {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) return false;
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('privileges')
        .eq('uid', uid)
        .single();
      if (error) return false;
      return Array.isArray(profile?.privileges) && profile.privileges.includes('admin');
    } catch (_) {
      return false;
    }
  },

  async redirectToRoleDashboard(): Promise<void> {
    const admin = await this.isAdmin();
    const target = admin ? '/admin' : '/';
    window.location.replace(target);
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) authStore.update(s => ({ ...s, error: error.message }));
      return { error };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign out failed';
      authStore.update(s => ({ ...s, error: message }));
      return { error: e as AuthError };
    }
  }
};

