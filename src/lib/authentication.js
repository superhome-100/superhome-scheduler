import { user, loginState, profileSrc } from '$lib/stores.js';
import { get } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { PUBLIC_FACEBOOK_APP_ID } from '$env/static/public';
import { toast } from 'svelte-french-toast';
import { popup } from '$lib/components/Popup.svelte';

export function loadFB () {
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
            profileSrc.set(response.data.url);
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
            loginState.set('in');
            loadProfilePic();
        }
    });
}

export async function login (callback) {
    loginState.set('pending');
    const FB = window['FB']
    FB.login(function (response) {
        if (response.status === 'connected') {
            let aR = response.authResponse;
            let userID = aR.userID;
            FB.api('/' + userID, function(response) {
                let name = response.name;
                toast.promise(
                    authenticateUser(userID, name, callback),
                    {
                        loading: 'Logging in...',
                        success: 'Success!',
                        error: 'Login error!'
                    }
                );
            });
        } else {
            popup('Facebook login returned status "' + response.status + '"');
            loginState.set('out');
        }
    }, { scope: 'email,public_profile' });
}

async function authenticateUser(facebookId, name, callback) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-type': 'application/json'},
        body: JSON.stringify({ userId: facebookId, userName: name })
    });
    const data = await response.json();
    if (data.status === 'error') {
        loginState.set('out');
        return Promise.reject();
    }

    user.set(data.record);
    callback();
    if (get(user).status === 'active') {
        loadProfilePic();
        return Promise.resolve();
    } else {
        return Promise.reject();
    }
}

export async function logout() {
    loginState.set('pending');
    profileSrc.set(null);
    const FB = window['FB']
    FB.getLoginStatus(function(response) {
        if (response.status === 'connected') {
            FB.logout();
        }
    });
    user.set(null);
    if (get(page).route.id !== '/') {
        goto('/');
    }
    await deleteSession();
    loginState.set('out');
}

async function deleteSession() {
    await fetch('/api/logout', { method: 'POST' });
}


