<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import { goto } from '$app/navigation';
	import { Toaster } from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { supabase_es } from '$lib/client/supabase_event_source';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Popup from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import {
		storedDayReservations_param,
		storedReservationsSummary_param,
		storedCore_params,
		storedSettings,
		storedAppVisibility,
		type CoreStore
	} from '$lib/client/stores';
	import { pushService } from '$lib/client/push';
	import Refresher from '$lib/components/Refresher.svelte';
	import * as Sentry from '@sentry/browser';
	import type { SettingsManager } from '$lib/settings';
	import type { Writable } from 'svelte/store';

	console.info('superhome-scheduler', __APP_VERSION__);

	// svelte-ignore unused-export-let
	export let params;
	export let data;
	const { user, supabase } = data;
	let settingsManager = data.settingsManager;

	Sentry.setUser(
		user
			? { id: user.id, status: user.status, privileges: user.privileges, createdAt: user.createdAt }
			: null
	);
	page.subscribe((p) => Sentry.setTag('route', p.route.id));
	storedDayReservations_param.subscribe((v) => Sentry.setContext('storedDayReservations_param', v));
	storedReservationsSummary_param.subscribe((v) =>
		Sentry.setContext('storedReservationsSummary_param', v)
	);

	(storedSettings as Writable<SettingsManager>).set(settingsManager);

	const publicRoutes = ['/privacy'];

	const onRefresh = async () => {
		window.location.reload();
	};

	if ($page.route.id && !publicRoutes.includes($page.route.id)) {
		onMount(async () => {
			if (user?.status !== 'disabled') {
				await supabase_es.init(supabase).catch((e) => console.error('supabase_es.init', e));
			}
			// this line being inside onMount protects from SSR leak
			(storedCore_params as Writable<CoreStore>).set({ supabase, user });

			const storedAppVisibilityW = storedAppVisibility as Writable<DocumentVisibilityState>;
			storedAppVisibilityW.set('visible');
			document.addEventListener('visibilitychange', () => {
				// by default (no tab change) this value is visible and no event is fired
				console.log('visibilitychange', document.visibilityState);
				storedAppVisibilityW.set(document.visibilityState);
				if (document.visibilityState === 'visible') {
					supabase_es
						.init(supabase)
						.then((isReconnected) => {
							if (isReconnected) {
								console.log('supabase_es.notifyAll');
								supabase_es.notifyAll();
							}
						})
						.catch((reason) => console.error('supabase_es.init', reason));
				}
			});
			storedSettings.subscribe((s) => {
				// to subscribe, and to update settingsManager bellow which is used in SSR as well
				settingsManager = s;
			});
			if (user) {
				await pushService.init(user.has_push ?? false);
			} else {
				goto('/login');
			}
		});
	}

	console.log('layout', $page.route.id, $page.params['day']);
</script>

<Toaster toastOptions={{ error: { duration: 5000 } }} />
<Refresher {onRefresh}>
	{#if $page.route.id && !publicRoutes.includes($page.route.id)}
		<Nprogress />
		<Sidebar {settingsManager} />

		<div id="app" class="flex px-1 mx-auto w-full">
			<main class="lg:ml-72 w-full mx-auto">
				<slot />
			</main>
		</div>

		<Popup />

		<Modal
			closeOnEsc={false}
			closeOnOuterClick={false}
			closeButton={false}
			styleWindow={{ width: 'fit-content', 'min-width': '300px' }}
		>
			<Notification />
		</Modal>
	{:else}
		<slot />
	{/if}
</Refresher>
