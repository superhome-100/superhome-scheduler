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
    import { settings, buoys, user, users, view, reservations } from '$lib/stores.js';
    import { onMount } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';


    $: loginState = 'pending';
    let profileSrc;

    $: {
        if (loginState === 'out' && $page.route.id != '/') {
            goto('/');
        }
    }

    onMount(initApp);

    async function refreshAppState() {
        console.log('refreshing...');
        let data = await get('AppData');
        if (data.status === 'success') {
            $reservations = data.reservations;
            $users = data.users;
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

                if ($user == null) {
                    loginState = 'out';
                } else {
                    loginState = 'in';
                    data = await get('AppData');
                    if (data.status === 'error') {
                        throw new Error('Could not read app data from database');
                    }
                    $reservations = data.reservations;
                    console.log($reservations);
                    $users = data.users;
                    setInterval(refreshAppState, $settings.refreshInterval.default);
                }
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

        const record = data.record;
        if (record.status === 'active') {
                    
            $user = {
                'name': record.name,
                'facebookId': record.facebookId,
                'id': record.id,
            };
            loginState = 'in';
            refreshAppState();
            loadProfilePic();
            return Promise.resolve();
        
        } else {

            if (record.status === 'disabled') {
                alert(
                    'User ' + name + ' does not have permission ' + 
                    'to access this app; please contact the admin for help'
                );
            } else {
                alert('Unexpected login error; Please try again');
            }
            await logout();
            return Promise.reject();
        }
    }

    async function logout() {
        loginState = 'pending';
        profileSrc = undefined;
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

</script>

<svelte:window bind:innerWidth={width} />

<Navbar let:hidden let:toggle color='currentColor'>
    <NavHamburger on:click={toggleDrawer} btnClass="ml-3 {loginState !== 'in' ? 'hidden' : ''} lg:hidden" />    
    <NavBrand href='/' class="lg:ml-64">
        <span class="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
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
                {#if profileSrc}
                    <img class='rounded-[50%] w-10' alt="profilePicture" src={profileSrc}>
                {:else}
                    <div class='text-xs'>{$user.name}</div>
                {/if}
            </NavLi>
        </NavUl>
    {/if}
</Navbar>

<Drawer
    transitionType= "fly"
    {backdrop}
    {transitionParams}
    bind:hidden={drawerHidden}
    bind:activateClickOutside={drawerHidden}
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
                class='bg-[#3b5998] text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
            >Log in with Facebook</button>
        {/if}
    </main>
</div>

<Toaster/>

