<script>
	import { sessionAuth } from '$lib/stores/auth';
</script>

<div>
	{#if $sessionAuth?.photoURL}
		<img class="rounded-[50%] w-10" alt="profilePicture" src={$sessionAuth?.photoURL} />
	{:else}
		<div class="text-xs">{$sessionAuth?.displayName || 'loading...'}</div>
	{/if}
</div>
