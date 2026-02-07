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
		storedSettings,
		storedUser
	} from '$lib/client/stores';
	import { pushService } from '$lib/client/push';
	import Refresher from '$lib/components/Refresher.svelte';
	import { coreStore } from '$lib/client/stores';
	import { getSettingsManager } from '$lib/settingsManager';
	import * as Sentry from '@sentry/browser';

	// svelte-ignore unused-export-let
	export let params;
	export let data;
	const { user, supabase, settings } = data;

	page.subscribe((p) => {
		Sentry.setTag('route', p.route.id);
	});

	storedSettings.set(getSettingsManager(settings));

	const publicRoutes = ['/privacy'];

	const onRefresh = async () => {
		window.location.reload();
	};

	if ($page.route.id && !publicRoutes.includes($page.route.id)) {
		onMount(async () => {
			Sentry.setUser(user ? { id: user.id } : null);
			storedDayReservations_param.subscribe((v) =>
				Sentry.setContext('storedDayReservations_param', v)
			);
			storedReservationsSummary_param.subscribe((v) =>
				Sentry.setContext('storedReservationsSummary_param', v)
			);
			await supabase_es.init(supabase);
			coreStore.set({ supabase, user });

			if ($storedUser) {
				await pushService.init($storedUser.has_push);
			} else {
				goto('/login');
			}
		});
	}

	console.log('layout', $page.route.id, $page.params['day']);
</script>

<Refresher {onRefresh}>
	{#if $page.route.id && !publicRoutes.includes($page.route.id)}
		<Nprogress />
		<Sidebar day={$page.params['day'] || ''} />

		<div id="app" class="flex px-1 mx-auto w-full">
			<main class="lg:ml-72 w-full mx-auto">
				<slot />
			</main>
		</div>

		<Toaster />

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
