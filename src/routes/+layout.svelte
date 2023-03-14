<script lang="js">
    import { goto } from '$app/navigation';
    import '../styles.css';
    import FacebookAuth from '$lib/components/FacebookAuth.svelte'
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { user, view, reservations } from '$lib/stores.js';
    export let data;


    $reservations = data.reservations;
    
    function goToRoot() {
        $user = null;
        goto('/');
    }

    function logout() {
        deleteSession($user.dbId);
        goToRoot();
    }

    async function deleteSession(userId) {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
        });
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
                'name': name,
                'facebookId': facebookId,
                'dbId': record.id,
                'toString': () => name.toLowerCase().replace(/ /g, '')
            };
        } else if (record.status === 'disabled') {
            alert(
                'User ' + name + ' does not have permission ' + 
                'to access this app; please contact the admin for help'
            );
            goToRoot();
        } else {
            alert('Unexpected login error; Please try again');
        }
    }
</script>

<div id="app">
    <FacebookAuth 
        appId={PUBLIC_FACEBOOK_APP_ID} 
        on:auth-success={e => authenticateUser(e.detail.userId, e.detail.userName)} 
        on:auth-failure={e => alert(e.detail.error)}
        on:no-login={goToRoot}
        on:logout={logout}
    />
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

