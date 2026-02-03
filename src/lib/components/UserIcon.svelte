<script lang="ts">
	import { user } from '$lib/stores';
</script>

<div>
	{#if $user}
		<img class="rounded-[50%] w-10" alt={$user.name} src={$user.avatar_url} />
	{:else}
		<div class="text-xs">loading...</div>
	{/if}
</div>
