<script lang="js">
    import "../app.postcss";
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
    import { sineIn } from 'svelte/easing';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import UserIcon from '$lib/components/UserIcon.svelte';
    import Modal from '$lib/components/Modal.svelte';
    import Toggle from '$lib/components/Toggle.svelte';
    import { boatAssignments, settings, buoys, user, users, view, viewMode, reservations } from '$lib/stores.js';
    import { augmentRsv } from '$lib/utils.js';
    import { onMount } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';
    import Nprogress from "$lib/components/Nprogress.svelte";

    $: isFacebook = typeof window !== 'undefined' && window.navigator ? (navigator.userAgent.includes('FBAN') || navigator.userAgent.includes('FBAV')) : false;
    $: loginState = 'pending';
    let profileSrc;
    let intervalId;

    const schedulerDoc = 'https://docs.google.com/document/d/1FQ828hDuuPRnQ7QWYMykSv9bT3Lmxi0amLsFyTjnyuM/edit?usp=share_link';
    const facilitiesDoc = 'https://docs.google.com/document/d/11YbqoY5U_sxTduhAVCYpFmPd_QdaHuC8JhXrxgE1358/edit?usp=share_link';

    $: {
        if (loginState === 'out' && $page.route.id != '/') {
            goto('/');
        }
    }

    onMount(() => toast.promise(initApp(), {loading: 'loading...', error: 'Loading error'}));

    function downloadReservations(branch) {
        const fn = async () => {
            const response = await fetch('/api/getReservationsTable', {
                method: 'POST',
                headers: {'Content-type': 'application/json'},
                body: JSON.stringify({ branch })
            });
            if (response.status == 200) {
                let blob = await response.blob();
                let a = document.createElement('a');
                a.href = window.URL.createObjectURL(blob);
                a.download = `reservations-${branch}.csv`;
                a.click();
                a.remove();
                return Promise.resolve();
            } else {
                return Promise.reject();
            }
        };
        toast.promise(
            fn(),
            {
                loading: 'downloading...',
                success: 'success!',
                error: 'error!  please try again'
            }
        );
                
    }

    async function refreshAppState() {
        let data = await get('Settings');
        if (data.status === 'success') {
            $settings = data.settings;
            $buoys = data.buoys;
        }

        data = await get('AppData');
        if (data.status === 'success') {
            $users = data.usersById;
            $reservations = data.reservations.map((rsv) => augmentRsv(rsv, $users[rsv.user.id]));
        }
        $user = $users[$user.id];
        if ($user.status === 'disabled') {
            await logout();
        }
        if ($user.privileges === 'admin') {
            let data = await get('BoatAssignments');
            if (data.status === 'success') { 
                $boatAssignments = data.assignments;
            }
        }
    }

    async function initFromUser(vm='admin') {
        if ($user == null) {
            loginState = 'out';
        } else if ($user.status === 'active') {
            loginState = 'in';
            let data = await get('AppData');
            if (data.status === 'error') {
                throw new Error('Could not read app data from database');
            } 
            $users = data.usersById;
            $reservations = data.reservations.map((rsv) => augmentRsv(rsv, $users[rsv.user.id]));
            if ($user.privileges === 'admin') {
                $viewMode = vm;
                let data = await get('BoatAssignments');
                if (data.status === 'success') {
                    $boatAssignments = data.assignments;
                }
            }
            intervalId = setInterval(refreshAppState, $settings.refreshInterval.default);
        } else if ($user.status === 'disabled') {
            alert(
                'User ' + $user.name + ' does not have permission ' + 
                'to access this app; please contact the admin for help'
            );
            await logout();
        } else {
            throw new Error('Unknown user status');
        }
    }

    async function initApp() {
        let init = async () => {
            try {
                loadFB();
                let data = await get('Settings');
                if (data.status === 'error') {
                    throw new Error('Could not get settings from database');
                }
                $settings = data.settings;
                $buoys = data.buoys;
 
                data = await get('Session');
                if (data.status === 'error') {
                    throw new Error('Could not get session from database');
                }
                $user = data.user;
                 
                await initFromUser(data.viewMode);
 
                return true;

            } catch (error) {
                console.error(error);
                return false;
            }
        };

        // try up to 3 times to load app state
        for (let i=0; i < 3; i++) {
            let success = await init();
            if (success) {
                goto($page.url.href);
                return;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        goto('/error');
        return Promise.reject();
    }

    async function get(item) {
        const response = await fetch('/api/get' + item);
        const data = await response.json();
        return data;
    }

    function loadFB () {
        const script = document.createElement('script')
        script.async = true
        script.src = '//connect.facebook.net/en_US/sdk.js'
        script.onload = initFB
        document.head.appendChild(script)
        return {
            destroy () {
                document.head.removeChild(script)
            }
        }
    }

    function loadProfilePic() {
        const FB = window['FB'];
        FB.api(
            '/me/picture',
            'GET',
            {redirect: false},
            function(response) {
                profileSrc = response.data.url;
            }
        );
    }

    function initFB () {
        const FB = window['FB']
        FB.init({
            appId      : PUBLIC_FACEBOOK_APP_ID,
            cookie     : true,
            xfbml      : false,
            version    : 'v3.2' 
        });
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                loginState = 'in';
                loadProfilePic();
            }
        });
    }

    async function login () {
        loginState = 'pending';
        const FB = window['FB']
        FB.login(function (response) {
            if (response.status === 'connected') {
                let aR = response.authResponse;
                let userID = aR.userID;
                FB.api('/' + userID, function(response) {
                    let name = response.name;
                    toast.promise(
                        authenticateUser(userID, name), 
                        {
                            loading: 'Logging in...',
                            success: 'Success!',
                            error: 'Login error!'
                        }
                    );
                });
            } else {
                alert('Facebook login returned status "' + response.status + '"');
                loginState = 'out';
            }
        }, { scope: 'email,public_profile' });
    }

    async function authenticateUser(facebookId, name) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: facebookId, userName: name })
        });
        const data = await response.json();
        if (data.status === 'error') {
            loginState = 'out';
            return Promise.reject();
        }

        $user = data.record;
        await initFromUser();
        
        if ($user.status === 'active') {
            loadProfilePic();
            return Promise.resolve();
        } else {
            return Promise.reject();
        }
    }

    async function logout() {
        loginState = 'pending';
        profileSrc = undefined;
        if (intervalId) { clearInterval(intervalId); }
        intervalId = undefined;
        const FB = window['FB']
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                FB.logout();
            }
        });
        $user = null;
        if ($page.route.id !== '/') {
            goto('/');
        }
        await deleteSession();
        loginState = 'out';
        drawerHidden = true;
    }

    async function userLogout() {
        toast.promise(
            logout(),
            {
                loading: 'Logging out...',
                success: 'You are now logged out',
                error: 'Error: could not log out!'
            }
        );
    }

    async function deleteSession() {
        await fetch('/api/logout', { method: 'POST' });
    }

    let drawerHidden = true;
    $: activateClickOutside = !drawerHidden && width < breakPoint;

    const toggleDrawer = () => {
        if (loginState === 'in') {
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

    $: drawerHidden = loginState !== 'in' || width < breakPoint

    const toggleSide = () => {
      if (width < breakPoint) {
        drawerHidden = !drawerHidden;
      }
    };
    
    $: activeUrl = $page.url.pathname;
    let spanClass = 'pl-8 self-center text-md text-gray-900 whitespace-nowrap dark:text-white';

    const updateAdminMode = async (e) => {
        if (e.detail.checked) {
            $viewMode = 'admin';
        } else {
            $viewMode = 'normal';
        }
        await fetch('/api/updateViewMode', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({viewMode: $viewMode}),
        });
    };

</script>

<Nprogress/>
<svelte:window bind:innerWidth={width} />

<Navbar let:hidden let:toggle color='currentColor'>
    <NavHamburger on:click={toggleDrawer} btnClass="ml-3 {loginState !== 'in' ? 'hidden' : ''} lg:hidden" />    
    <NavBrand href='/' class="lg:ml-64">
        <span class="self-center whitespace-nowrap xs:text-xl font-semibold dark:text-white">
            SuperHOME Scheduler
        </span>
    </NavBrand>
    {#if $user && loginState === 'in'}
        <NavUl 
            divClass='block md:w-auto' 
            ulClass='flex flex-col p-0 mt-0 md:flex-row md:space-x-8 md:text-sm md:font-medium'
            {hidden}
        >
            <NavLi>
                <Modal closeButton={false}>
                    <UserIcon {profileSrc}/>
                </Modal>
            </NavLi>
        </NavUl>
    {/if}
</Navbar>

<Drawer
    transitionType= "fly"
    {backdrop}
    {transitionParams}
    bind:hidden={drawerHidden}
    bind:activateClickOutside={activateClickOutside}
    width="w-64"
    id="sidebar"
    divClass='overflow-y-auto z-50 p-4 bg-white dark:bg-[#252515]'
>
    <div class="flex items-center">
        <CloseButton on:click={() => (drawerHidden = true)} class="mb-4 dark:text-white lg:hidden" />
    </div>
    <Sidebar asideClass="w-54">
        <SidebarWrapper divClass="overflow-y-auto py-4 px-3 rounded">
            <SidebarGroup>
                {#if loginState === 'in'}
                    <SidebarItem label="Logout" on:click={userLogout} />
                {/if}
                {#if $user && $user.privileges === 'admin'}
                    <div class='ms-4'>
                        <Toggle checked={$viewMode==='admin'} on:change={updateAdminMode}/>
                        <span>Admin Mode</span>
                    </div>
                    {#if $viewMode === 'admin'}
                        <SidebarDropdownWrapper label='Download Reservations'>
                            <SidebarItem 
                                label='main'
                                {spanClass}
                                on:click={() => downloadReservations('main')}
                            />
                            <SidebarItem 
                                label='backup-day-1'
                                {spanClass}
                                on:click={() => downloadReservations('backup-day-1')}
                            />
                            <SidebarItem 
                                label='backup-day-2'
                                {spanClass}
                                on:click={() => downloadReservations('backup-day-2')}
                            />
                        </SidebarDropdownWrapper>
                    {/if}
                {/if}
                <SidebarItem label="My Reservations" href="/" on:click={toggleSide} active={activeUrl === `/`} />
                <SidebarDropdownWrapper isOpen={true} label="Calendars">
                    <SidebarItem
                        label= "Pool"
                        href="/{$view}/pool"
                        {spanClass}
                        on:click={toggleSide}
                        active={activeUrl === '/' + $view + '/pool'}
                    />
                    <SidebarItem
                        label= "Open Water"
                        href="/{$view}/openwater"
                        {spanClass}
                        on:click={toggleSide}
                        active={activeUrl === '/' + $view + '/openwater'}
                    /><SidebarItem
                        label= "Classroom"
                        href="/{$view}/classroom"
                        {spanClass}
                        on:click={toggleSide}
                        active={activeUrl === '/' + $view + '/classroom'}
                    />
                </SidebarDropdownWrapper>
                <SidebarItem label='How to use this app' target='_blank' href={schedulerDoc}/>
                <SidebarItem label='Facilities Guide' target='_blank' href={facilitiesDoc}/>
            </SidebarGroup>
        </SidebarWrapper>
    </Sidebar>
</Drawer>

<div id="app" class="flex px-1 mx-auto w-full">
    <main class="lg:ml-72 w-full mx-auto">
        {#if $user && loginState === 'in'}
            <slot/>
        {:else if loginState === 'out'}
            <button 
                on:click={login} 
                class='bg-[#3b5998] text-white text-sm xs:text-base absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            >Log in with Facebook</button>
        {/if}
    </main>
</div>

<Toaster/>

{#if isFacebook}
    <article class="fixed top-0 w-full h-full bg-orange-400 p-20">
        <h1>Please don't use facebook browser</h1>
        <p>To use default browser. Android tap in the upper right-hand corner. iOS tap in the lower right-hand corner.</p>
    </article>
{/if}
