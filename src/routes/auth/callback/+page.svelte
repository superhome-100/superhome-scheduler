<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';

	function cleanCallbackUrl() {
		try {
			const { pathname, search } = window.location;
			const clean = pathname + (search || '');
			if (window.location.hash) {
				replaceState('', clean);
			}
		} catch {}
	}

	onMount(async () => {
		cleanCallbackUrl();
	});
</script>

<main class="superhome-login-background">
	<div class="auth-message" aria-live="polite">Authenticating...</div>
</main>

<style>
	.auth-message {
		color: hsl(var(--bc));
		text-align: center;
		padding: 2rem;
	}
</style>
