<script>
	import { getContext } from 'svelte';
	import { Tab, Tabs, TabList, TabPanel } from '$lib/tabs.js';
	import ViewForm from '$lib/components/ViewForm.svelte';
	import ModifyForm from '$lib/components/ModifyForm.svelte';
	import { user } from '$lib/stores';
	import { beforeResCutoff, beforeCancelCutoff } from '$lib/reservationTimes';
	import { Settings } from '$lib/settings';

	export let rsvs;
	export let hasForm;
	export let disableModify = false;

	const { close } = getContext('simple-modal');

	let viewOnly = (rsv) =>
		!beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category) ||
		(!beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category) &&
			['autonomous', 'cbs'].includes(rsv.resType));

	let tabIndex = 0;
	const handleAdminSubmit = (event) => {
		let idx = rsvs.indexOf(event.detail.rsv);
		if (idx == rsvs.length - 1) {
			close();
		} else {
			tabIndex = idx + 1;
		}
	};
</script>

<div class="mb-4">
	<Tabs bind:tabIndex>
		<TabList>
			{#each rsvs as rsv}
				<Tab>{rsv.user.nickname}</Tab>
			{/each}
		</TabList>

		{#each rsvs as rsv}
			<TabPanel>
				{#if !disableModify && !viewOnly(rsv) && $user.id === rsv.user.id}
					<ModifyForm {hasForm} {rsv} />
				{:else}
					<ViewForm {hasForm} bind:rsv on:submit={handleAdminSubmit} />
				{/if}
			</TabPanel>
		{/each}
	</Tabs>
</div>
