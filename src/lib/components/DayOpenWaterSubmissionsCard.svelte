<script lang="ts">
	import type { Submission } from '$types';
	import { displayTag, badgeColor } from '$lib/utils';
	import { user } from '$lib/stores';
	import _ from 'lodash';

	export let submissions: Submission[];
	export let adminView: boolean = false;

	export let onClick: (e: MouseEvent) => void = () => {};

	export let adminComment: string = '';

	const curUserStyling = (rsv) => {
		if (rsv.user === $user?.id) {
			return 'border border-transparent rounded bg-lime-300 text-black';
		} else {
			return '';
		}
	};
</script>

{#if submissions.length}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="text-center w-full" on:click={onClick}>
		<div
			class="bg-gradient-to-br from-openwater-bg-from to-openwater-bg-to text-openwater-fg py-0.5 sm:py-2 pr-1 flex flex-col rounded-md cursor-pointer text-sm"
		>
			{#each _.sortBy(submissions, 'user') as rsv, i}
				<div class="flex items-center w-full px-2">
					<div class="flex-1 text-xs lg:text-base {curUserStyling(rsv)} overflow-auto break-all">
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
