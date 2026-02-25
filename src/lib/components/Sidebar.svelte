<script lang="ts">
	import { PUBLIC_STAGE, PUBLIC_SUPABASE_URL } from '$env/static/public';
	import { browser } from '$app/environment';
	import {
		Navbar,
		NavBrand,
		NavLi,
		NavUl,
		NavHamburger,
		Sidebar,
		SidebarGroup,
		SidebarItem,
		SidebarWrapper,
		Drawer,
		CloseButton,
		SidebarDropdownWrapper
	} from 'flowbite-svelte';
	import Modal from '$lib/components/Modal.svelte';
	import UserIcon from '$lib/components/UserIcon.svelte';
	import Toggle from '$lib/components/Toggle.svelte';
	import { sineIn } from 'svelte/easing';
	import { viewMode } from '$lib/stores';
	import { toast } from 'svelte-french-toast';
	import { page } from '$app/state';
	import { signOut } from '$lib/user';
	import { onMount } from 'svelte';
	import { subscription } from '$lib/client/push';
	import { pushService } from '$lib/client/push';
	import { getFeature } from '$lib/userFeature';
	import { storedCurrentDay, storedUser } from '$lib/client/stores';
	import type { SettingsManager } from '$lib/settings';

	export let settingsManager: SettingsManager;

	const supabaseTableUrl =
		PUBLIC_SUPABASE_URL.indexOf('localhost') !== -1
			? 'http://localhost:54323/project/default/editor'
			: `https://supabase.com/dashboard/project/${
					new URL(PUBLIC_SUPABASE_URL).host.split('.')[0]
			  }/editor`;
	const schedulerDoc =
		'https://docs.google.com/document/d/1FQ828hDuuPRnQ7QWYMykSv9bT3Lmxi0amLsFyTjnyuM/edit?usp=share_link';
	const viewModeStorageKey = 'superhome-scheduler.viewMode';
	const isOpenCalendarMenuStorageKey = 'superhome-scheduler.isOpenCalendarMenu';
	const isOpenAdminMenuStorageKey = 'superhome-scheduler.isOpenAdminMenu';

	$: user = $storedUser;

	let drawerHidden = true;
	$: activateClickOutside = !drawerHidden && width < breakPoint;

	function toggleDrawer() {
		if (user) {
			drawerHidden = !drawerHidden;
		}
	}

	// Drawer component
	let backdrop = false;
	let breakPoint = 1024;
	let width = 400;
	let transitionParams = {
		x: -320,
		duration: 200,
		easing: sineIn
	};

	$: drawerHidden = user === null || width < breakPoint;

	const toggleSide = () => {
		if (width < breakPoint) {
			drawerHidden = !drawerHidden;
		}
	};

	let spanClass = 'pl-8 self-center text-md text-gray-900 whitespace-nowrap dark:text-white';

	function downloadDatabase(table: string | null = null) {
		const fn = async () => {
			const response = await fetch('/api/admin/downloadDatabase', {
				method: 'POST',
				headers: { 'Content-type': 'application/json' },
				body: JSON.stringify({ table })
			});
			if (response.status == 200) {
				let disp = await response.headers.get('Content-Disposition');
				let fn = /attachment; filename=(.*)/.exec(disp!)![1];
				let blob = await response.blob();
				let a = document.createElement('a');
				a.href = window.URL.createObjectURL(blob);
				a.download = fn;
				a.click();
				a.remove();
				return Promise.resolve();
			} else {
				return Promise.reject();
			}
		};
		toast
			.promise(fn(), {
				loading: 'downloading...',
				success: 'success!',
				error: 'error! please try again'
			})
			.catch((e) => console.warn('downloading-db', e));
	}

	function updatePrices() {
		const fn = async () => {
			const response = await fetch('/api/admin/updatePrices');
			if (response.status == 200) {
				return Promise.resolve();
			} else {
				return Promise.reject();
			}
		};
		toast
			.promise(fn(), {
				loading: 'updating prices...',
				success: 'updated prices!',
				error: 'error! please try again'
			})
			.catch((e) => console.warn('update.price', e));
	}

	async function userLogout() {
		toast
			.promise(signOut(page.data.supabase), {
				loading: 'Logging out...',
				success: 'You are now logged out',
				error: 'Error: could not log out!'
			})
			.catch((e) => console.warn('userLogout', e));
	}

	const updateSubscription = async (e: any) => {
		if (e.detail.checked) {
			const swr = await navigator.serviceWorker.ready;
			pushService.subscribe(swr);
		} else {
			pushService.unsubscribe();
		}
	};

	const updateAdminMode = async (e: any) => {
		if (e.detail.checked) {
			$viewMode = 'admin';
		} else {
			$viewMode = 'normal';
		}
		localStorage.setItem(viewModeStorageKey, $viewMode);
	};

	$: pushNotificationEnabled = ((user, sm, day) => {
		const smv = sm.get('pushNotificationEnabled', day);
		if (!user) return smv;
		return getFeature(user, 'pushNotificationEnabled', smv);
	})(user, settingsManager, $storedCurrentDay);

	let isOpenCalendarsMenu: boolean;
	$: {
		if (browser && isOpenCalendarsMenu !== undefined)
			localStorage.setItem(isOpenCalendarMenuStorageKey, `${isOpenCalendarsMenu}`);
	}
	let isOpenAdminMenu: boolean;
	$: {
		if (browser && isOpenAdminMenu !== undefined)
			localStorage.setItem(isOpenAdminMenuStorageKey, `${isOpenAdminMenu}`);
	}

	onMount(() => {
		$viewMode =
			(localStorage.getItem(viewModeStorageKey) ?? 'normal') === 'admin' &&
			user?.privileges === 'admin'
				? 'admin'
				: 'normal';
		isOpenCalendarsMenu = (localStorage.getItem(isOpenCalendarMenuStorageKey) ?? 'true') === 'true';
		isOpenAdminMenu = (localStorage.getItem(isOpenAdminMenuStorageKey) ?? 'false') === 'true';
	});
</script>

<svelte:window bind:innerWidth={width} />

<Navbar let:hidden let:toggle class="!z-50">
	<NavHamburger onClick={toggleDrawer} class="ml-3 {user ? '!block' : 'hidden'}" />
	<NavBrand href="/" class="lg:ml-64">
		<span class="self-center whitespace-nowrap xs:text-xl font-semibold dark:text-white">
			SuperHOME Scheduler
			{#if PUBLIC_STAGE !== 'production'}
				<span style="background-color: red;">{PUBLIC_STAGE}</span>
			{/if}
		</span>
	</NavBrand>
	{#if user}
		<NavUl
			divClass="block md:w-auto"
			ulClass="flex flex-col p-0 mt-0 md:flex-row md:space-x-8 md:text-sm md:font-medium"
			hidden={false}
		>
			<NavLi>
				<Modal closeButton={false}>
					<UserIcon />
				</Modal>
			</NavLi>
		</NavUl>
	{/if}
</Navbar>

<Drawer
	transitionType="fly"
	{backdrop}
	{transitionParams}
	bind:hidden={drawerHidden}
	bind:activateClickOutside
	width="w-64"
	id="sidebar"
	divClass="overflow-y-auto z-50 p-4 bg-white dark:bg-[#252515]"
>
	<div class="flex items-center">
		<CloseButton on:click={() => (drawerHidden = true)} class="mb-4 dark:text-white lg:hidden" />
	</div>
	<Sidebar asideClass="w-54">
		<SidebarWrapper divClass="overflow-y-auto py-4 px-3 rounded">
			<SidebarGroup>
				{#if user}
					<SidebarDropdownWrapper label="Profile">
						<SidebarItem label="Logout" on:click={userLogout} />
						{#if pushNotificationEnabled}
							<div class="ms-4">
								<Toggle checked={!!$subscription} on:change={updateSubscription} />
								<span>Notifications</span>
							</div>
						{/if}
						{#if user.privileges === 'admin'}
							<div class="ms-4">
								<Toggle checked={$viewMode === 'admin'} on:change={updateAdminMode} />
								<span>Admin Mode</span>
							</div>
						{/if}
					</SidebarDropdownWrapper>
				{/if}
				<SidebarItem label="My Reservations" href="/" on:click={toggleSide} />
				<SidebarDropdownWrapper bind:isOpen={isOpenCalendarsMenu} label="Calendars">
					<SidebarItem label="Pool" href="/multi-day/pool" {spanClass} on:click={toggleSide} />
					<SidebarItem
						label="Open Water"
						href="/multi-day/openwater"
						{spanClass}
						on:click={toggleSide}
					/><SidebarItem
						label="Classroom"
						href="/multi-day/classroom"
						{spanClass}
						on:click={toggleSide}
					/>
				</SidebarDropdownWrapper>
				{#if $viewMode === 'admin'}
					<SidebarDropdownWrapper label="Admin" bind:isOpen={isOpenAdminMenu}>
						{#if getFeature(user, 'admin-users', false)}
							<SidebarItem label="Users" {spanClass} href="/admin/users" on:click={toggleSide} />
						{/if}
						<SidebarItem
							label="Send Notification"
							{spanClass}
							href="/admin/notify-reservations"
							on:click={toggleSide}
						/>
						<SidebarDropdownWrapper label="Admin: Advanced" isOpen={false}>
							<SidebarItem label="Supabase" {spanClass} target="_blank" href={supabaseTableUrl} />
							<SidebarItem
								label="Sentry Logs"
								{spanClass}
								target="_blank"
								href="https://superhome.sentry.io/explore/logs/"
								on:click={toggleSide}
							/>
							<SidebarItem
								label="Download Reservations"
								{spanClass}
								on:click={() => {
									downloadDatabase('Reservations');
									toggleSide();
								}}
							/>
							<SidebarItem
								label="Download DB"
								{spanClass}
								on:click={() => {
									downloadDatabase('all');
									toggleSide();
								}}
							/>
							<SidebarItem
								label="Update prices manually"
								{spanClass}
								on:click={() => {
									updatePrices();
									toggleSide();
								}}
							/>
							<SidebarItem
								label="Simulate error"
								{spanClass}
								on:click={() => {
									updatePrices.missing.simulate_error();
								}}
							/>
						</SidebarDropdownWrapper>
					</SidebarDropdownWrapper>
				{/if}
				<SidebarItem label="How to use this app" target="_blank" href={schedulerDoc} />
				<SidebarItem
					label="Facilities Guide"
					target="_blank"
					href="https://www.freedivesuperhome.com/facility-guideline"
					on:click={toggleSide}
				/>
				<SidebarItem
					label="Messenger Group"
					target="_blank"
					href="https://m.me/j/Abaj0BzT0Q8K85gO/"
					on:click={toggleSide}
				/>
				<SidebarItem
					label="Privacy Policy"
					target="_blank"
					href="https://app.freedivesuperhome.com/privacy"
					on:click={toggleSide}
				/>
			</SidebarGroup>
		</SidebarWrapper>
	</Sidebar>
</Drawer>
