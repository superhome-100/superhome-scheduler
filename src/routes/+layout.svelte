<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Popup, { popup } from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import { PUBLIC_FACEBOOK_APP_ID } from '$env/static/public';	
	import {
		boatAssignments,
		buoys,
		loginState,
		notifications,
		reservations,
		settings,
		user,
		userPastReservations,
		users,
		view,
		viewMode
	} from '$lib/stores';
	import { augmentRsv } from '$lib/utils.js';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { login, logout } from '$lib/authentication';
	import { toast, Toaster } from 'svelte-french-toast';
	import { FacebookAuth } from '@beyonk/svelte-social-auth';
	import { P } from 'flowbite-svelte';
	import { getAppData, getBoatAssignments, getSession, getSettings, getUserPastReservations } from '$lib/api';
	import { onMount } from 'svelte';
	$: isFacebook =
		typeof window !== 'undefined' && window.navigator
			? navigator.userAgent.includes('FBAN') || navigator.userAgent.includes('FBAV')
			: false;

	let intervalId:number | undefined;

	$: if ($loginState === 'out' && $page.route.id != '/') {
		goto('/');
	}

	async function callLogout() {
		if (intervalId) {
			clearInterval(intervalId);
		}
		intervalId = undefined;
		await logout();
	}

	async function refreshAppState() {
		// TODO: this is expensive
		const resSettings = await getSettings();
		if (resSettings.status === 'success') {
			$settings = resSettings.settings;
			$buoys = resSettings.buoys;
		}

		// TODO: cleanup
		if (!$user) {
			return callLogout();
		};

		let minDateStr = datetimeToLocalDateStr(new Date());
		const resAppData = await getAppData($user.id, minDateStr);

		if (resAppData.status === 'success') {
			$users = resAppData.usersById!;
			$user = $users[$user.id];
			if ($user && $user.status === 'disabled') {
				await callLogout();
				return;
			}
			$notifications = resAppData.notifications!;
			// keep unchanged rsvs and update changed/add new ones
			let rsvById = $reservations.reduce((obj, rsv) => {
				obj[rsv.id] = rsv;
				return obj;
			}, {});
			(resAppData.reservations || []).forEach((rsv) => {
				rsvById[rsv.id] = augmentRsv(rsv);
			});
			$reservations = Object.values(rsvById).filter((rsv) => rsv.status !== 'canceled');
		}

		if ($user && $user.privileges === 'admin') {
			let data = await getBoatAssignments();
			if (data.status === 'success') {
				$boatAssignments = data.assignments;
			}
		}
	}

	const oneWeekAgo = () => {
		let d = new Date();
		d.setDate(d.getDate() - 7);
		return datetimeToLocalDateStr(d);
	};

	async function initFromUser(vm = 'admin') {
		if ($user == null) {
			$loginState = 'out';
		} else if ($user.status === 'active') {
			$loginState = 'in';
			let minDateStr = oneWeekAgo();
			let appData = await getAppData($user.id, minDateStr);

			if (appData.status === 'error') {
				throw new Error('Could not read app data from database');
			}
			$users = appData.usersById!;
			$reservations = (appData.reservations || [])
				.filter((rsv) => rsv.status != 'canceled')
				.map((rsv) => augmentRsv(rsv));

			$notifications = appData.notifications!;

			let maxDateStr = datetimeToLocalDateStr(new Date());
			const reqReservations = await getUserPastReservations($user.id, maxDateStr);
			if (reqReservations.status === 'success') {
				$userPastReservations = (reqReservations.userPastReservations || []).map((rsv) => {
					return augmentRsv(rsv, $user);
				});
			}

			if ($user.privileges === 'admin') {
				$viewMode = vm;
				let data = await getBoatAssignments();
				if (data.status === 'success') {
					$boatAssignments = data.assignments;
				}
			}

			intervalId = setInterval(refreshAppState, $settings.refreshInterval.default);
		} else if ($user.status === 'disabled') {
			popup(
				'User ' +
					$user.name +
					' does not have permission ' +
					'to access this app; please contact the admin for help'
			);
			await callLogout();
		} else {
			await callLogout();
			throw new Error('Unknown user status');
		}
	}

	async function initApp() {
		const resSettings = await getSettings();
		if (resSettings.status === 'error') {
			throw new Error('Could not get settings from database');
		}
		$settings = resSettings.settings;
		$buoys = resSettings.buoys;

		const resSession = await getSession();
		if (resSession.status === 'error') {
			throw new Error('Could not get session from database');
		}
		$user = resSession.user!;
		await initFromUser(resSession.viewMode);
	}

	const getUserFromAuth = (e: any) => {
		const uid = _.get(e, 'detail.userId', '');
		const accessToken = _.get(e, 'detail.accessToken', '');
		if (uid) {
			console.log("uid:", uid);
			$loginState = 'in';
			login(uid, accessToken);
		} else {
			$loginState = 'out';
		}
	}

	onMount(() => {
		if (!isFacebook) {
			// @ts-ignore
			toast.promise(initApp(), {
				loading: 'loading...',
				error: 'Loading error',
			});
		}
	});
</script>

<Nprogress />
<Sidebar />
<div id="app" class="flex px-1 mx-auto w-full">
	<main class="lg:ml-72 w-full mx-auto">
		{#if $user && $loginState === 'in'}
			<slot />
		{:else}
			<div class="m-auto flex items-center justify-center pt-10">
				<FacebookAuth
					appId="{PUBLIC_FACEBOOK_APP_ID}"
					on:auth-success={getUserFromAuth}
					on:auth-info={getUserFromAuth}	
				/>
			</div>
		{/if}
	</main>
</div>

<Toaster />

{#if isFacebook}
	<article class="fixed text-center top-0 w-full h-full bg-orange-400 p-20">
		<h1 class="font-bold">Please don't use Facebook browser</h1>
		<br />
		<p>To use default browser:</p>
		<ul>
			<li><b>Android -</b> tap in the upper right-hand corner</li>
			<li><b>iOS -</b> tap in the lower right-hand corner</li>
		</ul>
	</article>
{/if}

<Popup />

<Modal
	closeOnEsc={false}
	closeOnOuterClick={false}
	closeButton={false}
	styleWindow={{ width: 'fit-content', 'min-width': '300px' }}
>
	<Notification />
</Modal>
