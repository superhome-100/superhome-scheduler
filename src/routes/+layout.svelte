<script lang="js">
    import '../styles.css';
    import FacebookAuth from '$lib/components/FacebookAuth.svelte'
    import { PUBLIC_FACEBOOK_APP_ID } from "$env/static/public";
    import { userId } from '$lib/stores.js';
    let user;

    async function authenticateUser(facebookId, userName) {
        $userId = facebookId;
        const response = await fetch('/', {
            method: 'POST',
            headers: {'Content-type': 'application/json'},
            body: JSON.stringify({ userId: facebookId, userName: userName })
        });
        const result = await response.json();
        if (result === 'active') {
            user = userName.toLowerCase().replace(/ /g,'');
        } else {
            alert(
                'User ' + userName + ' does not have permission ' + 
                'to access this app; please contact the admin for help'
            );
        }
    }
</script>

<div id="app">
    {#if user}
        <div id="category_buttons">
            <a href="/{user}">
                <button>My Reservations</button>
            </a>
            <a href="/pool">
                <button>Pool</button>
            </a>
            <a href="/open-water">
                <button>Open Water</button>
            </a>
            <a href="/classroom">
                <button>Classroom</button>
            </a>
        </div>
    {:else}
        <FacebookAuth 
            appId={PUBLIC_FACEBOOK_APP_ID} 
            on:auth-success={e => authenticateUser(e.detail.userId, e.detail.userName)} 
            on:auth-failure={e => alert(e.detail.error)}
        />
    {/if}
    <slot />
</div>

