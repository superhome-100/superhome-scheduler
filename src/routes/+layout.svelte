<script lang="js">
    import { goto } from '$app/navigation';
    import '../styles.css';
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { user, view, reservations } from '$lib/stores.js';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { toast, Toaster } from 'svelte-french-toast';

    $: buttonText = loggedIn ? 'Log out' : 'Log in with Facebook';
    $: buttonClass = loggedIn ? 'fb_loggedin' : 'fb_loggedout';
    
    const loginOnClick = () => loggedIn ? logout() : login();

    let loggedIn = $user != null;
    let hideLogin = loggedIn;
    
    onMount(async () => initApp());

    async function initApp() {
        loadFB();
        $reservations = await loadReservations();
        $user = await getSession();
        if ($user != null) {
            goto('/' + $user.facebookId);
        }
    }

    async function getSession() {
        const response = await fetch('/api/getSession');
        const user = await response.json();
        return user;
    }

    async function loadReservations() {
        const response = await fetch('/api/getReservations', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
        });
        const reservations = await response.json();
        return reservations;
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
                loggedIn = true;
            }
        });
    }

    async function login () {
        hideLogin = true;
        const FB = window['FB']
        FB.login(function (response) {
            if (response.status === 'connected') {
                let aR = response.authResponse;
                let userID = aR.userID;
                FB.api('/' + userID, function(response) {
                    let name = response.name;
                });
                toast.promise(
                    authenticateUser(userID, name), 
                    {
                        loading: 'Logging in...',
                        success: 'Success!',
                        error: 'Login error!'
                    }
                );
            } else {
                alert(response);
            }
        }, { scope: 'email,public_profile' });
        hideLogin = false;
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
            loggedIn = true;
            if ($page.route.id === '/') {
                goto('/' + $user.facebookId);
            }
            
        } else {

            if (record.status === 'disabled') {
                alert(
                    'User ' + name + ' does not have permission ' + 
                    'to access this app; please contact the admin for help'
                );
            } else {
                alert('Unexpected login error; Please try again');
            }
            hideLogin = false;
            $user = null;
            if ($page.route.id !== '/') {
                goto('/');
            }
        }
    }
    
    async function logout() {
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
        loggedIn = false;
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
    <button on:click={loginOnClick} class={buttonClass} hidden={hideLogin}>{buttonText}</button>
   {#if $user}
        <div id="category_buttons">
            <a href="/{$user.facebookId}">
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

