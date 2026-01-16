<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import { goto } from '$app/navigation';
	import { Toaster } from 'svelte-french-toast';
	import { onMount } from 'svelte';
	import { sessionAuth } from '$lib/stores/auth';
	import { page } from '$app/stores';

	export let data; // has data = { settings } parsed from xata
	$settings = data.settings;

	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Popup from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import {
		loginState,
		notifications,
		settings,
		stateLoaded,
		user,
		users,
		viewMode,
		profileSrc,
		syncBuoys
	} from '$lib/stores';
	import { authenticateUser } from '$lib/authentication';
	import { getUsers, getSession, getUserNotifications } from '$lib/api';
	import { auth } from '$lib/firebase';

	const publicRoutes = ['/privacy'];

	let isLoading = false;
	let authLoaded = false;

	async function initializeUserSessionData(setViewMode = 'admin') {
		if ($user == null) {
			$loginState = 'out';
		} else {
			$loginState = 'in';
			$notifications = await getUserNotifications();
			if ($user.privileges === 'admin') {
				$viewMode = setViewMode;
			}
		}
	}

	async function initApp() {
		if (isLoading) {
			// prevent overloading our server
			return;
		}
		try {
			isLoading = true;
			syncBuoys();

			getUsers().then((res) => {
				try {
					if (res.status === 'error') {
						throw new Error(res.error);
					}
					$users = res.usersById!;
				} catch (error) {
					console.error(error);
				}
			});
			getSession().then((res) => {
				if (res.status !== 'success') {
					$loginState = 'out';
					throw new Error('Could not get session from database');
				} else {
					$user = res.user || null;
					$profileSrc = res.photoURL || '';
					initializeUserSessionData(res.viewMode);
				}
			});
			$stateLoaded = true;
		} catch (error) {
			console.error(error);
		} finally {
			isLoading = false;
		}
	}
	if ($page.route.id && !publicRoutes.includes($page.route.id)) {
		onMount(() => {
			authLoaded = false;
			return auth.onIdTokenChanged(
				async (user) => {
					console.info('user', user);
					if (user) {
						await initApp(); // TODO: remove this eventually
						$loginState = 'in';
						$sessionAuth = {
							email: user.email || '',
							uid: user.uid, // firebase uid
							displayName: user.displayName || 'nameless',
							provider: user.providerId as 'google.com' | 'facebook.com',
							providerId: user.providerData[0].providerId, // facebook or google
							photoURL: user.photoURL || ''
						};
						const usersRecord = await authenticateUser({
							userId: user.providerData[0].uid,
							providerId: user.providerData[0].providerId,
							userName: user.displayName || 'nameless',
							photoURL: user.photoURL || '',
							email: user.email || '',
							firebaseUID: user.uid
						});
						if (usersRecord) {
							$user = usersRecord;
						} else {
							goto('/login');
						}
					} else {
						$loginState = 'out';
						goto('/login');
					}
					authLoaded = true;
				},
				(error) => {
					console.error(error);
					authLoaded = true;
				}
			);
		});
	}

	console.log('layout', $page.route.id, $page.params['day']);
</script>

{#if $page.route.id && !publicRoutes.includes($page.route.id)}
	<Nprogress />
	<Sidebar day={$page.params['day'] || ''} />

	{#if authLoaded}
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
