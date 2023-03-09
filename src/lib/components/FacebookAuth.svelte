<script>
    import { createEventDispatcher } from 'svelte'
    export let appId;
    let hidden = true;
    const dispatch = createEventDispatcher()
    const version = 'v3.2'

    function action () {
        const script = document.createElement('script')
        script.async = true
        script.src = '//connect.facebook.net/en_US/sdk.js'
        script.onload = initialise
        document.head.appendChild(script)
        return {
            destroy () {
                document.head.removeChild(script)
            }
        }
    }
    
    function dispatchAuthorized(response) {
        const userId = response.userID
        const accessToken = response.accessToken
        FB.api('/' + userId, function(response) {
            const userName = response.name;
            dispatch('auth-success', {
                accessToken,
                userId,
                userName
            })
        });
    }

    function initialise () {
        const FB = window['FB']
        if (!appId) {
            console.error('Missing Facebook App ID');
        }
        FB.init({
            appId      : appId,
            cookie     : true,
            xfbml      : false,
            version    : version
        });
        FB.getLoginStatus(function(response) {
            if (response.status === "connected") {
                hidden = true;
                dispatchAuthorized(response.authResponse);
            } else {
                hidden = false;
            }    
        });
    }

    function login () {
        const FB = window['FB']
        FB.login(function (response) {
            if (response.status === 'connected') {
                dispatchAuthorized(response.authResponse);
            } else {
                dispatch('auth-info', { response })
            }
        }, { scope: 'email,public_profile' })
    }
</script>

<button on:click={login} hidden={hidden} use:action>Log In with Facebook</button>

