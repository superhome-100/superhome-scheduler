<script>
    import { createEventDispatcher } from 'svelte'
    export let appId
    export let text = 'Sign in with Facebook'
    const dispatch = createEventDispatcher()
    const version = 'v3.2'
    let disabled = true
    function action () {
        const script = document.createElement('script')
        script.async = true
        script.src = '//connect.facebook.net/en_GB/sdk.js'
        script.onload = initialise
        document.head.appendChild(script)
        return {
            destroy () {
                document.head.removeChild(script)
            }
        }
    }
    function initialise () {
        const FB = window['FB']
        if (!appId) {
            console.error('Missing Facebook AppId')
        }
        FB.init({
            appId      : appId,
            cookie     : true,
            xfbml      : false,
            version    : version
        })
        disabled = false
    }
    function login () {
        const FB = window['FB']
        FB.login(function (response) {
            if (response.status === 'connected') {
                const authResponse = response.authResponse
                const userId = authResponse.userID
                const accessToken = authResponse.accessToken
                FB.api('/' + userId, function(response) {
                    const userName = response.name;
                    dispatch('auth-success', {
                        accessToken,
                        userId,
                        userName
                    })
                });
            } else {
                dispatch('auth-info', { response })
            }
        }, { scope: 'email,public_profile' })
    }
</script>

<button on:click={login} {disabled} use:action>Log In with Facebook</button>

