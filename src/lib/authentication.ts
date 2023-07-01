import { user, loginState, profileSrc } from '$lib/stores';
import { get } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { toast } from 'svelte-french-toast';
import type { UsersRecord } from './server/xata.codegen';

export async function login(uid: string, accessToken: string) {
	try {
		const response = await fetch(`https://graph.facebook.com/me?fields=id,name,picture&access_token=${accessToken}`);
		const data = await response.json() as {
			id: string;
			name: string,
			picture: {
				data: {
					url: string;
				}
			}
		};

		profileSrc.set(data.picture.data.url);
		toast.promise(authenticateUser(uid, data.name), {
			loading: 'Logging in...',
			success: 'Success!',
			error: 'Login error!'
		});
	} catch (e) {
		console.log(e);
		loginState.set('out');
	}
}

async function authenticateUser(facebookId: string, name: string) {
	const response = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify({ userId: facebookId, userName: name })
	});
	const data = await response.json() as {
		status: 'success' | 'error';
		record?: UsersRecord;
		error?: string;
	};
	if (data.status === 'error') {
		loginState.set('out');
	}
	user.set(data.record || null);
}

export async function logout() {
	loginState.set('pending');
	profileSrc.set(null);
	const FB = window['FB'];
	FB.getLoginStatus(function (response) {
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
