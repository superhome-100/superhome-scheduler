import type { Session, SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase.types';
import type { Settings, UserEx } from '$types';
import type { SettingsManager } from '$lib/settingsManager';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			settings: SettingsManager;
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{
				session: Session | null;
				auth_user: AuthUser | null;
				user: UserEx | null;
			}>;
			session: Session | null;
			auth_user: AuthUser | null;
			user: UserEx | null;
		}
		interface PageData {
			settings: Settings;
			supabase: SupabaseClient<Database>;
			session: Session | null;
			user: UserEx | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
