<script lang="js">
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import '../styles.css';
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { settings, buoys, user, users, view, reservations } from '$lib/stores.js';
    import { onMount } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';


    let loginState = 'pending';
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

</script>

<div id="app">
    {#if $user && loginState === 'in'}
        <button on:click={userLogout} class="fb_loggedin">Log out</button>
        {#if profileSrc}
            <img id="profilePicture" alt="profilePicture" src={profileSrc}>
        {:else}
            <div id="currentUser">Logged in as: <b>{$user.name}</b></div>
        {/if}
    {:else if loginState === 'out'}
        <button on:click={login} class="fb_loggedout">Log in with Facebook</button>
    {/if}
        
    {#if $user}
        <div id="category_buttons">
            <a href="/">
                <button>My Reservations</button>
            </a>
            <a href="/{$view}/pool">
                <button>Pool</button>
            </a>
            <a href="/{$view}/openwater">
                <button>Open Water</button>
            </a>
            <a href="/{$view}/classroom">
                <button>Classroom</button>
            </a>
        </div>
    {/if}
    <slot />
</div>

<Toaster/>

