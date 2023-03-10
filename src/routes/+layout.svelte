<script lang="js">
    import { goto } from '$app/navigation';
    import '../styles.css';
    import FacebookAuth from '$lib/components/FacebookAuth.svelte'
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { userId, view, reservations } from '$lib/stores.js';
    
    export let data;

    $reservations = data.reservations;

    function goToRoot() {
        goto('/');
    }

    async function authenticateUser(facebookId, userName) {
        const response = await fetch('/', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: facebookId, userName: userName })
        });
        const result = await response.json();
        if (result === 'active') {
            $userId = facebookId; 
            userName = userName.toLowerCase().replace(/ /g,'');
        } else {
            alert(
                'User ' + userName + ' does not have permission ' + 
                'to access this app; please contact the admin for help'
            );
        }
    }
</script>

<div id="app">
    {#if $userId}
        <div id="category_buttons">
            <a href="/{$userId}">
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
    {:else}
        <FacebookAuth 
            appId={PUBLIC_FACEBOOK_APP_ID} 
            on:auth-success={e => authenticateUser(e.detail.userId, e.detail.userName)} 
            on:auth-failure={e => alert(e.detail.error)}
            on:no-login={goToRoot}
        />
    {/if}
    <slot />
</div>

