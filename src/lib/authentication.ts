import { user, loginState, profileSrc } from '$lib/stores';
import { get } from 'svelte/store';
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import type { UsersRecord } from './server/xata.codegen';
import { auth } from './firebase';

interface authenticateUserArgs {
	userId: string;
	userName: string;
	photoURL: string;
	email: string;
	providerId: string;
	firebaseUID: string;
}
export async function authenticateUser(userData: authenticateUserArgs) {
	const response = await fetch('/api/login', {
		method: 'POST',
		headers: { 'Content-type': 'application/json' },
		body: JSON.stringify(userData)
	});
	const data = (await response.json()) as {
		status: 'success' | 'error';
		record?: UsersRecord;
		error?: string;
	};
	if (data.status === 'error') {
		loginState.set('out');
	} else {
		loginState.set('in');
	}
	user.set(data.record || null);
	return data.record;
}

export async function logout() {
	loginState.set('pending');
	profileSrc.set(null);
	user.set(null);
	await auth.signOut();
	await deleteSession();
	loginState.set('out');
	if (get(page).route.id !== '/login') {
		goto('/login');
	}
}

async function deleteSession() {
	await fetch('/api/logout', { method: 'POST' });
}
