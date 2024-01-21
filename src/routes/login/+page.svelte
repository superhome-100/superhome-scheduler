<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '../../lib/firebase';
	import { FacebookAuthProvider, signInWithRedirect, signInWithPopup } from 'firebase/auth';

	let session: 'loading' | 'in' | 'out' = 'loading';

	// const loginWithGoogle = async () => {
	//   const googleProvider = new GoogleAuthProvider();
	//   await signInWithPopup(auth, googleProvider);
	// };

	const loginWithFacebook = async () => {
		session = 'loading';
		const facebookProvider = new FacebookAuthProvider();
		facebookProvider.addScope('email');

		if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)  && !/iPad|iPhone|iPod/.test(navigator.platform)) {
			// Use popup for Safari
			try {
				await signInWithPopup(auth, facebookProvider);
			} catch (error) {
				console.error(error);
				await signInWithRedirect(auth, facebookProvider);
			}
		} else {
			// Use redirect for other browsers
			await signInWithRedirect(auth, facebookProvider);
		}
	};

	onMount(() => {
		return auth.onIdTokenChanged(async (user) => {
			if (!user) {
				session = 'out';
			} else {
				session = 'in';
			}
		});
	});


</script>

<div class="flex flex-col text-black w-48 gap-2">
	<h3 class="text-white">Login with</h3>
	<!-- <button on:click={loginWithGoogle}>Google</button> -->
	<button disabled={['loading','in'].includes(session)} on:click={loginWithFacebook}>Facebook</button>
</div>
