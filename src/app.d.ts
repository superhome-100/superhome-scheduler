import type { Session, SupabaseClient, User as AuthUser } from '@supabase/supabase-js';
import type { Database } from '$lib/supabase.types';
import type { Settings, UserEx } from '$types';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{
				session: Session;
				auth_user: AuthUser;
				user: UserEx;
			} | {
				session: null;
				auth_user: null;
				user: null;
			}>;
		}
		interface PageData {
			settings: Settings;
			settingsManager: SettingsManager;
			supabase: SupabaseClient<Database>;
			session: Session | null;
			user: UserEx | null;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export { };
