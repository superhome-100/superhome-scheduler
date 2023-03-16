<script lang="js">
    import { goto } from '$app/navigation';
    import '../styles.css';
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { user, view, reservations } from '$lib/stores.js';
    import { page } from '$app/stores';
    import { onMount } from 'svelte';

    export let data;

    $: buttonText = loggedIn ? 'Log out' : 'Log in with Facebook';
    $: buttonClass = loggedIn ? 'fb_loggedin' : 'fb_loggedout';
    
    const loginOnClick = () => loggedIn ? logout() : login();

    $reservations = data.reservations;
    $user = data.user;

    let loggedIn = data.user != null;

    onMount(async () => loadFB());

    async function loadFB () {
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

    async function initFB () {
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

    function login () {
        const FB = window['FB']
        FB.login(function (response) {
            if (response.status === 'connected') {
                let aR = response.authResponse;
                /*await */ authenticateUser(aR.userID, aR.name);
            } else {
                alert(response);
            }
        }, { scope: 'email,public_profile' })
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
        loggedIn = false;
        $user = null;
        await deleteSession();
        if ($page.route.id !== '/') {
            goto('/');
        }
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
    <button on:click={loginOnClick} class={buttonClass}>{buttonText}</button>
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

