<script lang="ts">
	import '../app.postcss';
	import _ from 'lodash';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Nprogress from '$lib/components/Nprogress.svelte';
	import Spinner from '$lib/components/spinner.svelte';
	import Popup, { popup } from '$lib/components/Popup.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Notification from '$lib/components/Notification.svelte';
	import { PUBLIC_FACEBOOK_APP_ID } from '$env/static/public';
	import dayjs from 'dayjs';
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
	import { augmentRsv } from '$lib/utils.js';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { login, logout } from '$lib/authentication';
	import { toast, Toaster } from 'svelte-french-toast';
	import { FacebookAuth } from '@beyonk/svelte-social-auth';
	import {
		getAppData,
		getBoatAssignments,
		getSession,
		getSettings,
		getUserPastReservations,
		getUserNotifications
	} from '$lib/api';
	import { onMount } from 'svelte';

	let intervalId: number | undefined;

	export let data; // has data = { settings } parsed from xata
	$settings = data.settings;

	$: if ($loginState === 'out' && $page.route.id != '/') {
		goto('/');
	}
	$: isFacebook =
		typeof window !== 'undefined' && window.navigator
			? navigator.userAgent.includes('FBAN') || navigator.userAgent.includes('FBAV')
			: false;

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
		} else if ($user.status === 'disabled') {
			popup(
				'User ' +
					$user.name +
					' does not have permission ' +
					'to access this app; please contact the admin for help'
			);
			callLogout();
		} else if ($user.status === 'active') {
			$loginState = 'in';

			const maxDateStr = datetimeToLocalDateStr(new Date());
			const [userNotifications, reqReservations, reqBoatAssignments] = await Promise.all([
				getUserNotifications(),
				getUserPastReservations($user.id, maxDateStr),
				getBoatAssignments()
			]);
			$notifications = userNotifications;

			if (reqReservations.status === 'success') {
				$userPastReservations = (reqReservations.userPastReservations || []).map((rsv) => {
					return augmentRsv(rsv, $user);
				});
			}

			if (reqBoatAssignments.status === 'success') {
				$boatAssignments = reqBoatAssignments.assignments;
			}
			if ($user.privileges === 'admin') {
				$viewMode = setViewMode;
			}
		} else {
			// in case the admin made a typo in the status field of the Xata UI
			throw new Error('Unknown user status!');
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
			const [, resSettings, resAppData] = await Promise.all([
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
				getSettings(),
				getAppData(oneWeekAgo)
			]);
			if (resSettings.status === 'error') {
				throw new Error('Could not get settings from database');
			}

			$buoys = resSettings.buoys;
			$users = resAppData.usersById!;
			$stateLoaded = true;
			const rsvById: { [id: string]: any } = $reservations.reduce((obj, rsv) => {
				obj[rsv.id] = rsv;
				return obj;
			}, {});
			(resAppData.reservations || []).forEach((rsv) => {
				rsvById[rsv.id] = augmentRsv(rsv);
			});
			$reservations = Object.values(rsvById).filter((rsv) => rsv.status !== 'canceled');

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
		if (!isFacebook) {
			// @ts-ignore
			toast.promise(initApp(), {
				loading: 'loading...',
				error: 'Loading error'
			});
		}

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
		{#if $loginState === 'in'}
			<slot />
		{:else}
			{#if $loginState === 'pending'}
				<div class="m-auto flex items-center justify-center pt-10">
					<Spinner />
				</div>
			{/if}
			<div class="{loginVisible($loginState)} m-auto flex items-center justify-center pt-10">
				<FacebookAuth
					appId={PUBLIC_FACEBOOK_APP_ID}
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
