import { PUBLIC_STAGE } from '$env/static/public';
import * as Sentry from '@sentry/sveltekit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from '$lib/supabase.types';
import { createServerClient } from '@supabase/ssr';
import { getSettingsManager } from '$lib/settings';
import type { Handle } from '@sveltejs/kit';
import { sessionToSessionId } from '$lib/server/supabase';
import { console_error } from '$lib/server/sentry';
import { fetchRetryForSupabase } from '$lib/supabase';

Sentry.initCloudflareSentryHandle({
	dsn: 'https://f2da7b160a72d4083e99922a3ae707fe@o4510844761931776.ingest.de.sentry.io/4510844770975824',

	// Enable logs to be sent to Sentry
	enableLogs: true, // PUBLIC_STAGE !== 'dev' TODO:mate

	// integrations: [
	// 	Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
	// ],

	environment: PUBLIC_STAGE ?? 'production',
	release: `superhome-scheduler.server@${__APP_VERSION__}`,

	// uncomment the line below to enable Spotlight (https://spotlightjs.com)
	// spotlight: import.meta.env.DEV,
});

export const handle: Handle = sequence(
	Sentry.sentryHandle(),
	async ({ event, resolve }) => {
		event.locals.supabase = createServerClient<Database>(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_PUBLISHABLE_KEY,
			{
				global: {
					fetch: fetchRetryForSupabase(event.fetch)
				},
				cookies: {
					getAll() {
						return event.cookies.getAll();
					},
					setAll(cookiesToSet) {
						/**
						 * Note: You have to add the `path` variable to the
						 * set and remove method due to sveltekit's cookie API
						 * requiring this to be set, setting the path to an empty string
						 * will replicate previous/standard behavior (https://kit.svelte.dev/docs/types#public-types-cookies)
						 */
						cookiesToSet.forEach(({ name, value, options }) =>
							event.cookies.set(name, value, { ...options, path: '/' })
						);
					}
				}
			}
		);
		/**
		 * Unlike `supabase.auth.getSession()`, which returns the session _without_
		 * validating the JWT, this function also calls `getUser()` to validate the
		 * JWT before returning the session.
		 */
		event.locals.safeGetSession = async () => {
			const {
				data: { session }
			} = await event.locals.supabase.auth.getSession();
			if (!session) {
				return { session: null, auth_user: null, user: null };
			}
			const {
				data: { user: auth_user },
				error
			} = await event.locals.supabase.auth.getUser();
			if (error) {
				console_error("couldn't get session", error);
				return { session, auth_user: null, user: null };
			}
			const { data: user, error: user_error } = await event.locals.supabase
				.from('Users')
				.select('*')
				.eq('authId', auth_user!.id)
				.single();
			if (user_error) {
				console_error("couldn't get user", user_error);
				return { session, auth_user, user: null };
			}
			const sessionId = sessionToSessionId(session);
			const { data: uSession } = await event.locals.supabase
				.from('UserSessions')
				.select('sessionId')
				.eq('sessionId', sessionId)
				.single();
			return {
				session,
				auth_user,
				user: {
					...user,
					avatar_url: auth_user?.user_metadata?.avatar_url ?? null,
					last_sign_in_at: auth_user?.last_sign_in_at ?? null,
					has_push: !!uSession
				}
			};
		};

		const { session, auth_user, user } = await event.locals.safeGetSession();
		event.locals.session = session;
		event.locals.auth_user = auth_user;
		event.locals.user = user;
		event.locals.settings = await getSettingsManager(event.locals.supabase);

		// event.locals avaiable in actions and +layout.server.ts

		return resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			}
		});
	}
);

export const handleError = Sentry.handleErrorWithSentry();
