<script lang="js">
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
	import { loginState, user, view, viewMode } from '$lib/stores';
	import { toast } from 'svelte-french-toast';
	import { logout } from '$lib/authentication';
	import { page } from '$app/stores';
	import { auth, loginWithGoogle, isGoogleLinked } from '$lib/firebase';

	export let day = '';
	const schedulerDoc =
		'https://docs.google.com/document/d/1FQ828hDuuPRnQ7QWYMykSv9bT3Lmxi0amLsFyTjnyuM/edit?usp=share_link';

	let drawerHidden = true;
	$: activateClickOutside = !drawerHidden && width < breakPoint;

	const toggleDrawer = () => {
		if ($loginState === 'in') {
			drawerHidden = !drawerHidden;
		}
	};

	// Drawer component
	let backdrop = false;
	let breakPoint = 1024;
	let width;
	let transitionParams = {
		x: -320,
		duration: 200,
		easing: sineIn
	};

	$: drawerHidden = $loginState !== 'in' || width < breakPoint;

	const toggleSide = () => {
		if (width < breakPoint) {
			drawerHidden = !drawerHidden;
		}
	};

	$: activeUrl = $page.url.pathname;
	let spanClass = 'pl-8 self-center text-md text-gray-900 whitespace-nowrap dark:text-white';

	function downloadDatabase(branch, table = null) {
		const fn = async () => {
			const response = await fetch('/api/downloadDatabase', {
				method: 'POST',
				headers: { 'Content-type': 'application/json' },
				body: JSON.stringify({ branch, table })
			});
			if (response.status == 200) {
				let disp = await response.headers.get('Content-Disposition');
				let fn = /attachment; filename=(.*)/.exec(disp)[1];
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
		toast.promise(fn(), {
			loading: 'downloading...',
			success: 'success!',
			error: 'error!  please try again'
		});
	}

	async function userLogout() {
		toast.promise(logout(), {
			loading: 'Logging out...',
			success: 'You are now logged out',
			error: 'Error: could not log out!'
		});
	}

	const updateAdminMode = async (e) => {
		if (e.detail.checked) {
			$viewMode = 'admin';
		} else {
			$viewMode = 'normal';
		}
		await fetch('/api/updateViewMode', {
			method: 'POST',
			headers: { 'Content-type': 'application/json' },
			body: JSON.stringify({ viewMode: $viewMode })
		});
	};
</script>

<svelte:window bind:innerWidth={width} />

<Navbar let:hidden let:toggle color="currentColor">
	<NavHamburger
		on:click={toggleDrawer}
		btnClass="ml-3 {$loginState !== 'in' ? 'hidden' : ''} lg:hidden"
	/>
	<NavBrand href="/" class="lg:ml-64">
		<span class="self-center whitespace-nowrap xs:text-xl font-semibold dark:text-white">
			SuperHOME Scheduler
		</span>
	</NavBrand>
	{#if $user && $loginState === 'in'}
		<NavUl
			divClass="block md:w-auto"
			ulClass="flex flex-col p-0 mt-0 md:flex-row md:space-x-8 md:text-sm md:font-medium"
			{hidden}
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
				{#if $loginState === 'in'}
					<SidebarItem label="Logout" on:click={userLogout} />
				{/if}
				{#if $user && $user.privileges === 'admin'}
					<div class="ms-4">
						<Toggle checked={$viewMode === 'admin'} on:change={updateAdminMode} />
						<span>Admin Mode</span>
					</div>
					{#if $viewMode === 'admin'}
						<SidebarDropdownWrapper label="Download DBs">
							<SidebarItem
								label="Reservations"
								{spanClass}
								on:click={() => downloadDatabase('main', 'Reservations')}
							/>
							<SidebarItem label="main" {spanClass} on:click={() => downloadDatabase('main')} />
							<SidebarItem
								label="backup-day-1"
								{spanClass}
								on:click={() => downloadDatabase('backup-day-1')}
							/>
							<SidebarItem
								label="backup-day-2"
								{spanClass}
								on:click={() => downloadDatabase('backup-day-2')}
							/>
						</SidebarDropdownWrapper>
					{/if}
				{/if}
				<SidebarItem
					label="My Reservations"
					href="/"
					on:click={toggleSide}
					active={activeUrl === `/`}
				/>
				<SidebarDropdownWrapper isOpen={true} label="Calendars">
					<SidebarItem
						label="Pool"
						href="/{$view}/pool/{day}"
						{spanClass}
						on:click={toggleSide}
						active={activeUrl === '/' + $view + '/pool'}
					/>
					<SidebarItem
						label="Open Water"
						href="/{$view}/openwater/{day}"
						{spanClass}
						on:click={toggleSide}
						active={activeUrl === '/' + $view + '/openwater'}
					/><SidebarItem
						label="Classroom"
						href="/{$view}/classroom/{day}"
						{spanClass}
						on:click={toggleSide}
						active={activeUrl === '/' + $view + '/classroom'}
					/>
				</SidebarDropdownWrapper>
				<SidebarItem label="How to use this app" target="_blank" href={schedulerDoc} />
				<SidebarItem
					label="Facilities Guide"
					target="_blank"
					href="https://www.freedivesuperhome.com/facility-guideline"
				/>
				<SidebarItem
					label="Messenger Group"
					target="_blank"
					href="https://m.me/j/Abaj0BzT0Q8K85gO/"
				/>
				{#if !isGoogleLinked() && $user?.id && auth?.currentUser?.providerData[0].providerId === 'facebook.com'}
					<SidebarItem
						label="Link Google Account"
						on:click={async () => {
							if ($user?.id) window.localStorage.setItem('user_record_id', $user.id);
							await loginWithGoogle();
							// console.log(auth?.currentUser?.providerData[0].providerId);
							// save current uid to local storage
							// on login detect if uid exists in local storage
						}}
					/>
				{/if}
				<SidebarItem
					label="Privacy Policy"
					target="_blank"
					href="https://www.freeprivacypolicy.com/live/3cd67fba-2961-4800-b397-22e2a4eabe6e"
				/>
			</SidebarGroup>
		</SidebarWrapper>
	</Sidebar>
</Drawer>
