<script lang="ts">
	import { auth } from '../../lib/firebase';
	import { FacebookAuthProvider, signInWithRedirect, signInWithPopup } from 'firebase/auth';

	// const loginWithGoogle = async () => {
	//   const googleProvider = new GoogleAuthProvider();
	//   await signInWithPopup(auth, googleProvider);
	// };

	const loginWithFacebook = async () => {
		const facebookProvider = new FacebookAuthProvider();
		if (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
			// Use popup for Safari
			try {
				await signInWithPopup(auth, facebookProvider);
			} catch (error) {
				console.error(error);
			}
		} else {
			// Use redirect for other browsers
			await signInWithRedirect(auth, facebookProvider);
		}
	};
</script>

<div class="flex flex-col justify-center text-black w-48 gap-2">
	<h3 class="text-white">Login with</h3>
	<!-- <button on:click={loginWithGoogle}>Google</button> -->
	<button on:click={loginWithFacebook} class="bg-[#1877F2] text-white">Facebook</button>
</div>
