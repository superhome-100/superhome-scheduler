<script lang="ts">
	export let data;
	const { supabase } = data;
	import { signInWithGoogle, signInWithFacebook } from '$lib/user.js';

	let errorMessage = '';
	const handleGoogleLogin = async (): Promise<void> => {
		try {
			const { error } = await signInWithGoogle(supabase);
			if (error) errorMessage = error.message;
		} finally {
		}
	};

	const handleFacebookLogin = async (): Promise<void> => {
		try {
			const { error } = await signInWithFacebook(supabase);
			if (error) errorMessage = error.message;
		} finally {
		}
	};
</script>

<!-- Login Section -->
<div class="flex flex-col text-black w-full gap-2">
	{#if errorMessage}
		<div class="alert alert-error text-sm" role="alert" aria-live="polite">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="stroke-current shrink-0 h-6 w-6"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<span>{errorMessage}</span>
		</div>
	{/if}

	<!-- Google Login Button -->
	<button
		type="button"
		class="btn bg-white text-black border-[#e5e5e5] w-full h-12 text-base font-medium gap-3"
		on:click={handleGoogleLogin}
		disabled={false}
		aria-label="Sign in with Google"
	>
		<svg
			aria-label="Google logo"
			width="16"
			height="16"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 512 512"
		>
			<g>
				<path d="m0 0H512V512H0" fill="#fff" />
				<path fill="#34a853" d="M153 292c30 82 118 95 171 60h62v48A192 192 0 0190 341" />
				<path fill="#4285f4" d="m386 400a140 175 0 0053-179H260v74h102q-7 37-38 57" />
				<path fill="#fbbc02" d="m90 341a208 200 0 010-171l63 49q-12 37 0 73" />
				<path fill="#ea4335" d="m153 219c22-69 116-109 179-50l55-54c-78-75-230-72-297 55" />
			</g>
		</svg>
		Login with Google
	</button>

	<!-- Facebook Login Button -->
	<button
		type="button"
		class="btn bg-[#1A77F2] text-white border-[#005fd8] w-full h-12 text-base font-medium gap-3 mt-2"
		on:click={handleFacebookLogin}
		disabled={false}
		aria-label="Sign in with Facebook"
	>
		<svg
			aria-label="Facebook logo"
			width="16"
			height="16"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
		>
			<path fill="white" d="M8 12h5V8c0-6 4-7 11-6v5c-4 0-5 0-5 3v2h5l-1 6h-4v12h-6V18H8z" />
		</svg>
		Login with Facebook
	</button>
</div>
