<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '../../lib/firebase';
	import { FacebookAuthProvider, signInWithRedirect, signInWithPopup } from 'firebase/auth';
	import { goto } from '$app/navigation';

	let session: 'loading' | 'in' | 'out' = 'loading';

	// const loginWithGoogle = async () => {
	//   const googleProvider = new GoogleAuthProvider();
	//   await signInWithPopup(auth, googleProvider);
	// };

	const loginWithFacebook = async () => {
		session = 'loading';
		const facebookProvider = new FacebookAuthProvider();
		facebookProvider.addScope('email');
		const isChromeDesktop =
			/Chrome/.test(navigator.userAgent) &&
			/Google Inc/.test(navigator.vendor) &&
			!/Android/.test(navigator.userAgent);
		if (isChromeDesktop) {
			await signInWithRedirect(auth, facebookProvider);
		} else {
			await signInWithPopup(auth, facebookProvider);
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
	<!-- <button on:click={loginWithGoogle}>Google</button> -->
	<button disabled={['loading', 'in'].includes(session)} on:click={loginWithFacebook}
		>Facebook</button
	>
</div>
