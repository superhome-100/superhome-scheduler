<script lang="ts">
	import type { Submission } from '$types';
	import { displayTag } from '$lib/utils.js';
	import { badgeColor } from '$lib/utils.js';
	export let submissions: Submission[];
	export let adminView: boolean = false;

	export let onClick: (e: MouseEvent) => void = () => {};

	export let adminComment: string = '';
</script>

{#if submissions.length}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="text-center w-full" on:click={onClick}>
		<div
			class="bg-openwater-bg-from py-2 pr-1 flex flex-col gap-1 rounded-md cursor-pointer openwater text-sm"
		>
			{#each submissions as rsv, i}
				<div class="flex items-center w-full px-2">
					<div
						class="flex-1 text-xs lg:text-base border border-transparent rounded bg-lime-300 text-black overflow-auto break-all"
					>
						{displayTag(rsv, adminView)}
					</div>
					<div class="pl-1 w-1">
						<span class="rsv-indicator {badgeColor([rsv])}" />
					</div>
				</div>
			{/each}

			{#if adminComment}
				<p class="flex flex-col text-sm p-0 text-gray-200">
					ADMIN: {adminComment}
				</p>
			{/if}
		</div>
	</div>
{/if}
