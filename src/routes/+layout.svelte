<script lang="ts">
	import '../app.postcss';
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
		type CoreStore,
		storedUser
	} from '$lib/client/stores';
	import { pushService } from '$lib/client/push';
	import Refresher from '$lib/components/Refresher.svelte';
	import * as Sentry from '@sentry/browser';
	import type { SettingsManager } from '$lib/settings';
	import type { Writable } from 'svelte/store';
	import type { UserEx } from '$types';
	import { PUBLIC_STAGE } from '$env/static/public';

	console.info('superhome-scheduler', __APP_VERSION__);

	// svelte-ignore unused-export-let
	export let params;
	export let data;
	const { user, supabase } = data;
	let settingsManager = data.settingsManager;

	Sentry.setUser(
		user
			? {
					id: user.id,
					status: user.status,
					privileges: user.privileges,
					createdAt: user.createdAt
			  }
			: null
	);
	$: Sentry.setContext('storedDayReservations_param', $storedDayReservations_param);
	$: Sentry.setContext('storedReservationsSummary_param', $storedReservationsSummary_param);

	// these two lines make sure that we have all the fresh data in time for Sidebar
	(storedUser as Writable<UserEx | null>).set(user);
	(storedSettings as Writable<SettingsManager>).set(settingsManager);
	$: settingsManager = $storedSettings;

	const publicRoutes = ['/privacy'];

	const onRefresh = async () => {
		window.location.reload();
	};

	const checkSupabaseConnectionGuard = {
		isChecking: false
	};
	const checkSupabaseConnection = async () => {
		if (checkSupabaseConnectionGuard.isChecking) return;
		const check = async () => {
			if (document.visibilityState === 'visible') {
				const isReconnected = await supabase_es.init(supabase, user);
				console.debug('supabase_es.init', isReconnected);
				if (isReconnected) {
					console.debug('supabase_es.notifyAll');
					supabase_es.notifyAll();
				}
			}
		};
		try {
			do {
				try {
					await check();
					break;
				} catch (e) {
					console.warn('checkSupabaseConnection.check', e);
					await new Promise((r) => setTimeout(r, 3000));
				}
			} while (
				// eslint-disable-next-line no-constant-condition
				true
			);
		} catch (e) {
			console.error('checkSupabaseConnection', e, document.visibilityState);
			//TODO:mate: check again later
		} finally {
			checkSupabaseConnectionGuard.isChecking = false;
		}
	};

	const handleVisibilityChange = async () => {
		console.debug('visibilitychange', document.visibilityState);
		checkSupabaseConnection();
	};
	const handleOnline = async () => {
		console.log('Connectivity restored.');
		checkSupabaseConnection();
	};

	if ($page.route.id && !publicRoutes.includes($page.route.id)) {
		onMount(async () => {
			await supabase_es.init(supabase, user).catch((e) => console.error('supabase_es.init', e));
			window.addEventListener('visibilitychange', handleVisibilityChange);
			window.addEventListener('online', handleOnline);
			// this line being inside onMount protects from SSR leak
			(storedCore_params as Writable<CoreStore>).set({ supabase, user });
			if (user) {
				await pushService.init(user.has_push ?? false);
			} else {
				goto('/login');
			}
		});
	}

	console.log('layout', $page.route.id, $page.params['day']);
</script>

{#if PUBLIC_STAGE !== 'production'}
	<style>
		.staging-banner {
			/* position: fixed; */
			top: 0;
			left: 0;
			width: 100%;
			height: 10px; /* Thin line */
			background-color: #ff3e00; /* High-visibility warning color */
			z-index: 9999;
			text-indent: -9999px; /* Hides text while remaining accessible to screen readers */
			pointer-events: none; /* Prevents interference with UI interactions */
		}

		/* Optional: Adjust global padding if the line needs to be thicker/visible text */
		:global(body) {
			margin-top: 4px;
		}
	</style>
	<div class="staging-banner" role="alert" />
{/if}
<Toaster toastOptions={{ error: { duration: 5000 } }} />
<Refresher {onRefresh}>
	{#if $page.route.id && !publicRoutes.includes($page.route.id)}
		<Nprogress />
		<Sidebar {supabase} />

		<div id="app" class="flex px-1 mx-auto w-full h-full">
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
