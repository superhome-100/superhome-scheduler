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

    onMount(initApp);

    async function refreshAppState() {
        console.log('refreshing...');
        let data = await loadAppData();
        $reservations = data.reservations;
        $users = data.users;
    }

    async function initApp() {
        let cmd = async () => {
            try {
                loadFB();
                let data = await getSettings();
                $settings = data.settings;
                $buoys = data.buoys;
                $user = await getSession();
                if ($user == null) {
                    loginState = 'out';
                } else {
                    loginState = 'in';
                    let data = await loadAppData();
                    $reservations = data.reservations;
                    $users = data.users;
                    setInterval(refreshAppState, $settings.refreshInterval);
                }
                return true;
            } catch (error) {
                console.log(error);
                if ('status' in error) {
                    console.log(error.status);
                    console.log(error.errors);
                }
                return false;
            }
        };

        for (let i=0; i < 3; i++) {
            let success = await cmd();
            if (success) {
                return;
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        goto('/error');
    }   

    async function getSettings() {
        const response = await fetch('/api/getSettings');
        const data = await response.json();
        return data;
    }

    async function getSession() {
        const response = await fetch('/api/getSession');
        const { user } = await response.json();
        return user;
    }

    async function loadAppData() {
        const response = await fetch('/api/getAppData', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
        });
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
            }
        }, { scope: 'email,public_profile' });
    }
    
    async function authenticateUser(facebookId, name) {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: facebookId, userName: name })
        });
        const record = await response.json();
        if (record.status === 'active') {
                    
            $user = {
                'name': record.name,
                'facebookId': record.facebookId,
                'id': record.id,
                'toString': () => name.toLowerCase().replace(/ /g, '')
            };
            loginState = 'in';
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
            $user = null;
            if ($page.route.id !== '/') {
                goto('/');
            }
            loginState = 'out';
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
        toast.promise(
            deleteSession().then(() => loginState = 'out'),
            {
                loading: 'Logging out...',
                success: 'You are now logged out',
                error: 'Error: could not log out!'
            }
        );
    }

    async function deleteSession() {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
        });
        return response;
    }

</script>

<div id="app">
    {#if $user && loginState === 'in'}
        <button on:click={logout} class="fb_loggedin">Log out</button>
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

