<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import dayjs from 'dayjs';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { toast, Toaster } from 'svelte-french-toast';
	import { FacebookAuth } from '@beyonk/svelte-social-auth';
	import { onMount } from 'svelte';
	import { PUBLIC_FACEBOOK_APP_ID } from '$env/static/public';

	// done move this 2 lines this has to initialize first
	// everything above should have nothing to do with with the settings store
	// TODO: reduce usage of $Settings on non-component libs
	export let data; // has data = { settings } parsed from xata
	$settings = data.settings;

	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Spinner from '$lib/components/spinner.svelte';
	import Popup, { popup } from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import {
		boatAssignments,
		buoys,
		loginState,
		notifications,
		reservations,
		settings,
		stateLoaded,
		user,
		userPastReservations,
		users,
		viewMode,
		profileSrc
	} from '$lib/stores';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { login, logout } from '$lib/authentication';
	import {
		getAppData,
		getBoatAssignments,
		getSession,
		getBuoys,
		getUserPastReservations,
		getUserNotifications
	} from '$lib/api';

	let intervalId: number | undefined;

	$: if ($loginState === 'out' && $page.route.id != '/login') {
		goto('/login');
	}

	let isLoading = false;

	async function callLogout() {
		if (intervalId) {
			clearInterval(intervalId);
		}
		intervalId = undefined;
		await logout();
	}

	async function initializeUserSessionData(setViewMode = 'admin') {
		if ($user == null) {
			$loginState = 'out';
		} else {
			$loginState = 'in';

			const maxDateStr = datetimeToLocalDateStr(new Date());
			const [userNotifications, reqReservations, reqBoatAssignments] = await Promise.all([
				getUserNotifications(),
				getUserPastReservations($user.id, maxDateStr),
				getBoatAssignments()
			]);
			$notifications = userNotifications;

			if (reqReservations.status === 'success') {
				$userPastReservations = reqReservations.userPastReservations;
			}

			if (reqBoatAssignments.status === 'success') {
				$boatAssignments = reqBoatAssignments.assignments;
			}
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

			const oneWeekAgo = dayjs().locale('en-US').subtract(7, 'day').format('YYYY-MM-DD');
			// TODO: this is super slow
			const [, resBuoys, resAppData] = await Promise.all([
				getSession().then((res) => {
					if (res.status !== 'success') {
						$loginState = 'out';
						throw new Error('Could not get session from database');
					} else {
						$user = res.user || null;
						$profileSrc = res.photoURL || '';
						initializeUserSessionData(res.viewMode);
					}
				}),
				getBuoys(),
				getAppData(oneWeekAgo)
			]);
			if (resBuoys.status === 'error') {
				throw new Error('Could not get buoys from database');
			}
			$buoys = resBuoys.buoys;
			if (resAppData.status === 'error') {
				throw new Error('Could not get application data from the database');
			}
			$users = resAppData.usersById!;
			$stateLoaded = true;

			// TODO: create separate stores for OW, Pool and Classroom reservations prefilter ahead of use
			$reservations = [...(resAppData.reservations || [])].filter(
				(rsv) => rsv.status !== 'canceled'
			);

			if (!intervalId) {
				intervalId = setInterval(initApp, $settings.refreshInterval.default);
			}
		} catch (error) {
			console.error(error);
		} finally {
			isLoading = false;
		}
	}

	const getUserFromAuth = async (e: any) => {
		$loginState = 'pending';
		const uid = _.get(e, 'detail.userId', '');
		const accessToken = _.get(e, 'detail.accessToken', '');
		if (uid) {
			await login(uid, accessToken, true);
			await initializeUserSessionData();
		} else {
			$loginState = 'out';
		}
	};

	onMount(() => {
		// @ts-ignore
		toast.promise(initApp(), {
			loading: 'loading...',
			error: 'Loading error'
		});

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});

	const loginVisible = (state) => (state === 'pending' ? 'invisible' : 'visible');
</script>

<Nprogress />
<Sidebar />
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
