<script lang="ts">
	import { onMount } from 'svelte';
	import { auth, loginWithFacebook, loginWithGoogle, isGoogleLinked } from '../../lib/firebase';
	import { goto } from '$app/navigation';

	let session: 'loading' | 'in' | 'out' = 'loading';

	enum ShowStep {
		LOGIN_OPTION,
		NEW_OLD_USER_CONFIRMATION,
		CONFIRM_LINK_GOOGLE,
		REQUIRE_FB_LOGIN_FIRST
	}
	let showStep: ShowStep = ShowStep.LOGIN_OPTION;

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

	const triggerGoogleLogin = async () => {
		if (isGoogleLinked()) {
			await loginWithGoogle();
		} else {
			showStep = ShowStep.NEW_OLD_USER_CONFIRMATION;
		}
	};
</script>

<div class="flex flex-col text-black w-48 gap-2">
	{#if showStep === ShowStep.LOGIN_OPTION}
		<h3 class="dark:text-white">Login with</h3>
		<button disabled={['loading', 'in'].includes(session)} on:click={triggerGoogleLogin}
			>Google</button
		>
		<button disabled={['loading', 'in'].includes(session)} on:click={() => login('facebook')}
			>Facebook</button
		>
	{:else if showStep === ShowStep.NEW_OLD_USER_CONFIRMATION}
		<p class="dark:text-white">Do you have an existing superhome account via facebook?</p>
		<button
			on:click={() => {
				showStep = ShowStep.CONFIRM_LINK_GOOGLE;
			}}>Yes</button
		>
		<button on:click={() => login('google')}>No</button>
	{:else if showStep === ShowStep.CONFIRM_LINK_GOOGLE}
		<p class="dark:text-white">Did you link your google account on us already?</p>
		<img src="/guide-link.webp" alt="guide" />
		<button
			on:click={() => {
				window.localStorage.setItem('is_google_linked', 'true');
				loginWithGoogle();
			}}>Yes</button
		>
		<button
			on:click={() => {
				showStep = ShowStep.REQUIRE_FB_LOGIN_FIRST;
			}}>No</button
		>
	{:else if showStep === ShowStep.REQUIRE_FB_LOGIN_FIRST}
		<p class="dark:text-white">Please login with Facebook first to link your Google account</p>
		<p class="dark:text-white">Click link google account at the sidebar after logging in</p>
		<button on:click={() => login('facebook')}>Login with Facebook</button>
	{/if}
	<a
		class="dark:text-white underline"
		target="_blank"
		href="https://www.freeprivacypolicy.com/live/3cd67fba-2961-4800-b397-22e2a4eabe6e" rel="noreferrer">Privacy Policy</a>
</div>
