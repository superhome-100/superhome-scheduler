<script lang="ts">
  import { onMount } from 'svelte';
import { auth, app } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } from 'firebase/auth';
// import { goto } from '@roxi/routify';

let user;

const loginWithGoogle = async () => {
  const googleProvider = new GoogleAuthProvider();
  await signInWithPopup(auth, googleProvider);
};

const loginWithFacebook = async () => {
  const facebookProvider = new FacebookAuthProvider();
  await signInWithPopup(auth, facebookProvider);
};

onMount(() => {
  return auth.onAuthStateChanged((user) => {
    if (user) {
      console.log(user);
    }
  });
});
</script>

<div class="flex flex-col text-black w-48 gap-2">
  <h3 class="text-white">Login with</h3>
  <button on:click={loginWithGoogle}>Google</button>
  <button on:click={loginWithFacebook}>Facebook</button>
</div>