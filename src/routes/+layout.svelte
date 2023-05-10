<script lang="js">
    import "../app.postcss";
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import Sidebar from '$lib/components/Sidebar.svelte';
    import Nprogress from "$lib/components/Nprogress.svelte";
    import Popup, { popup } from '$lib/components/Popup.svelte';
    import { 
        boatAssignments, 
        loginState, 
        settings, 
        buoys, 
        user, 
        users, 
        view, 
        viewMode, 
        reservations 
    } from '$lib/stores.js';
    import { augmentRsv } from '$lib/utils.js';
    import { loadFB, login, logout, profileSrc } from '$lib/authentication.js';
    import { toast, Toaster } from 'svelte-french-toast';

    $: isFacebook = typeof window !== 'undefined' && window.navigator 
        ? (navigator.userAgent.includes('FBAN') || navigator.userAgent.includes('FBAV')) 
        : false;
    
    let intervalId;

    $: {
        if ($loginState === 'out' && $page.route.id != '/') {
            goto('/');
        }
    }

    onMount(() => toast.promise(initApp(), {loading: 'loading...', error: 'Loading error'}));

    async function callLogout() {
        if (intervalId) { clearInterval(intervalId); }
        intervalId = undefined;
        drawerHidden = true;
        await logout();
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
            await callLogout();
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
            $loginState = 'out';
        } else if ($user.status === 'active') {
            $loginState = 'in';
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
            popup(
                'User ' + $user.name + ' does not have permission ' + 
                'to access this app; please contact the admin for help'
            );
            await callLogout();
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

</script>

<Nprogress/>
<Sidebar {profileSrc}/>
<div id="app" class="flex px-1 mx-auto w-full">
    <main class="lg:ml-72 w-full mx-auto">
        {#if $user && $loginState === 'in'}
            <slot/>
        {:else if $loginState === 'out'}
            <button 
                on:click={() => login(initFromUser)} 
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

<Popup/>

