<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, loginWithFacebook, loginWithGoogle } from '../../lib/firebase';
	import { goto } from '$app/navigation';

	let session: 'loading' | 'in' | 'out' = 'loading';

	const login = async (provider: 'facebook' | 'google') => {
		session = 'loading';
		if (provider === 'facebook') {
			await loginWithFacebook();
		} else {
			await loginWithGoogle();
		}
	};

	onMount(() => {
		return auth.onIdTokenChanged(async (user) => {
			if (!user) {
				session = 'out';
			} else {
				session = 'in';
				goto('/'); // redirect to home page after login
			}
		});
	});
</script>

<div class="flex flex-col text-black w-48 gap-2">
	<h3 class="text-white">Login with</h3>
	<button disabled={['loading', 'in'].includes(session)} on:click={() => login('google')}
		>Google</button
	>
	<button disabled={['loading', 'in'].includes(session)} on:click={() => login('facebook')}
		>Facebook</button
	>
</div>
