<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import { goto } from '$app/navigation';
	import { Toaster } from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { ensureUserProfile } from '$lib/user';
	import { supabase_es } from '$lib/client/supabase_event_source';

	export let data; // has data = { settings } parsed from xata
	const { user, supabase } = data;
	$settings = data.settings;

	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Popup from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import type { UserEx } from '$types';
	import {
		notifications,
		settings,
		stateLoaded,
		user as userStore,
		authStore,
		syncBuoys,
		syncUsers
	} from '$lib/stores';
	import { getUserNotifications } from '$lib/api';
	import { pushService } from '$lib/client/push';
	import Refresher from '$lib/components/Refresher.svelte';

	const publicRoutes = ['/privacy'];

	let isLoading = false;

	async function initApp() {
		if (isLoading) {
			// prevent overloading our server
			return;
		}
		try {
			isLoading = true;
			await Promise.allSettled([
				supabase_es.init(supabase),
				ensureUserProfile(user).then(async (u: UserEx | null) => {
					if (u) {
						$notifications = await getUserNotifications();
						await pushService.init();
					}
				}),
				syncBuoys(),
				syncUsers()
			]).then((results) => {
				results.forEach(
					(r) => r.status === 'rejected' && console.error('initApp problem', r.reason)
				);
			});
			$stateLoaded = true;
		} catch (error) {
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	const onRefresh = async () => {
		window.location.reload();
	};

	if ($page.route.id && !publicRoutes.includes($page.route.id)) {
		onMount(async () => {
			await initApp();
			if ($userStore == null) {
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

		{#if !$authStore.loading}
			<div id="app" class="flex px-1 mx-auto w-full">
				<main class="lg:ml-72 w-full mx-auto">
					<slot />
				</main>
			</div>
		{/if}

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
