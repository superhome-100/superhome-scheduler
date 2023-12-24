<script lang="ts">
  import { auth } from '../../lib/firebase';
  import { signInWithPopup, FacebookAuthProvider } from 'firebase/auth';

  // const loginWithGoogle = async () => {
  //   const googleProvider = new GoogleAuthProvider();
  //   await signInWithPopup(auth, googleProvider);
  // };

  const loginWithFacebook = async () => {
    const facebookProvider = new FacebookAuthProvider();
    await signInWithPopup(auth, facebookProvider);
  };
</script>

<div class="flex flex-col text-black w-48 gap-2">
  <h3 class="text-white">Login with</h3>
  <!-- <button on:click={loginWithGoogle}>Google</button> -->
  <button on:click={loginWithFacebook}>Facebook</button>
</div>