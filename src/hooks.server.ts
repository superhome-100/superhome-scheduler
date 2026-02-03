import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from '$lib/supabase.types';
import { createServerClient } from '@supabase/ssr';
import { getSettingsManager } from '$lib/server/settings';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = new URL(event.url);
	if (pathname.startsWith('/__/')) {
		const redirectUrl = new URL(`https://freedive-superhome.firebaseapp.com${pathname}`);
		redirectUrl.search = search; // copy URL parameters

		// Filter out problematic headers and forward method/body when appropriate
		const filteredHeaders = new Headers(event.request.headers);
		filteredHeaders.delete('host');
		filteredHeaders.delete('content-length');
		filteredHeaders.delete('transfer-encoding');

		const method = event.request.method;
		const init: RequestInit = { method, headers: filteredHeaders };
		if (!['GET', 'HEAD'].includes(method)) {
			// Clone body for forwarding; avoid attaching a body to GET/HEAD
			const buf = await event.request.arrayBuffer();
			init.body = buf;
		}

		const proxyResponse = await fetch(redirectUrl.toString(), init);

		// Stream the response through with original headers and status
		return new Response(proxyResponse.body, {
			status: proxyResponse.status,
			headers: proxyResponse.headers
		});
	}

	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_KEY,
		{
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
			console.error("couldn't get session", error);
			return { session, auth_user: null, user: null };
		}
		const { data: user, error: user_error } = await event.locals.supabase
			.from("Users")
			.select('*')
			.eq('authId', auth_user!.id)
			.single();
		if (user_error) {
			console.error("couldn't get user", user_error);
			return { session, auth_user, user: null };
		}
		return {
			session, auth_user, user: {
				...user,
				avatar_url: auth_user?.user_metadata?.avatar_url ?? null,
				last_sign_in_at: auth_user?.last_sign_in_at ?? null
			}
		};
	};

	const { session, auth_user, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.auth_user = auth_user;
	event.locals.user = user;
	event.locals.settings = await getSettingsManager();

	// event.locals avaiable in actions and +layout.server.ts

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
