import { writable } from 'svelte/store';
import { supabase } from '../utils/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

export type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

export const authStore = writable<AuthState>({ user: null, loading: true, error: null });

// Ensure a user profile exists for the current session user
export async function ensureUserProfile(user: User | null): Promise<void> {
  try {
    if (!user) return;
    const uid = user.id;
    
    // First check if profile already exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('uid')
      .eq('uid', uid)
      .single();
    
    if (existingProfile) {
      // Profile exists, just update the name if needed
      await supabase
        .from('user_profiles')
        .update({
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
          updated_at: new Date().toISOString()
        })
        .eq('uid', uid);
    } else {
      // Profile doesn't exist, create it
      await supabase
        .from('user_profiles')
        .insert({
          uid,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'User',
          // status and privileges use defaults from DB
          updated_at: new Date().toISOString()
        });
    }
  } catch (err) {
    console.error('Error ensuring user profile:', err);
    // Don't throw - this is best effort
  }
}

// Minimal auth init: keep user in a small store for UI convenience
supabase.auth.onAuthStateChange((_event, session) => {
  const user = session?.user ?? null;
  authStore.set({ user, loading: false, error: null });
  // Best-effort profile ensure on state changes
  if (user) {
    ensureUserProfile(user);
  }
});

// Populate initial session on first load
(async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[Auth] init getSession error:', error);
      authStore.set({ user: null, loading: false, error: error.message });
      return;
    }
    
    const user = data.session?.user ?? null;
    
    // Set the auth state immediately
    authStore.set({ user, loading: false, error: null });
    
    if (user) {
      // Don't await this to prevent blocking the UI
      ensureUserProfile(user).catch(() => {});
    }
    
  } catch (error) {
    console.error('[Auth] Initialization error:', error);
    authStore.set({ user: null, loading: false, error: 'Failed to initialize authentication' });
  }
})();

// Fallback timeout to prevent infinite loading
setTimeout(() => {
  authStore.update(state => {
    if (state.loading) {
      return { ...state, loading: false, error: 'Authentication timeout' };
    }
    return state;
  });
}, 5000); // Reduced to 5 second timeout for faster recovery

export const auth = {
  async getSession() {
    return await supabase.auth.getSession();
  },

  async signInWithGoogle(): Promise<{ error: AuthError | null }> {
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, queryParams: { prompt: 'select_account' } }
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
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo }
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
        .maybeSingle();
        
      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
      
      if (!profile) {
        console.warn('No user profile found for uid:', uid);
        return false;
      }
      
      const isAdmin = Array.isArray(profile.privileges) && profile.privileges.includes('admin');
      return isAdmin;
    } catch (e) {
      console.error('Exception in isAdmin check:', e);
      return false;
    }
  },

  async redirectToRoleDashboard(): Promise<void> {
    const admin = await this.isAdmin();
    const target = admin ? '/admin' : '/';
    // Use SvelteKit navigation
    if (typeof window !== 'undefined') {
      window.location.href = target;
    }
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        authStore.update(s => ({ ...s, error: error.message }));
        return { error };
      }
      
      // Clear the auth store immediately after successful sign out
      authStore.set({ user: null, loading: false, error: null });
      
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.replace('/');
      }
      
      return { error: null };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign out failed';
      authStore.update(s => ({ ...s, error: message }));
      return { error: e as AuthError };
    }
  }
};
