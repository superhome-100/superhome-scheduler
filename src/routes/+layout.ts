import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import type { LayoutLoad } from './$types';
import { getSettingsManager } from '$lib/settingsManager';
import { fetchRetryForSupabase } from '$lib/supabase';

// data: from +layout.server.ts
export const load: LayoutLoad = async ({ fetch, data, depends }) => {
	depends('supabase:auth');
	const supabase = isBrowser()
		? createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
			global: {
				fetch: fetchRetryForSupabase(fetch)
			}
		})
		: // the best would be if it is PUBLIC and RLS does it's job but that's not gonna happen now
		createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
			global: {
				fetch: fetchRetryForSupabase(fetch)
			},
			cookies: {
				getAll() {
					return data.supabaseCookies;
				}
			}
		});

	return {
		settings: data.settings,
		settingsManager: getSettingsManager(data.settings),
		supabase,
		session: data.session,
		user: data.user,
	}; // avaiable in .svetle as 'export let data'
};
