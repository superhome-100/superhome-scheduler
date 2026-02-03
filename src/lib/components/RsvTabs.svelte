<script lang="ts">
	import { getContext } from 'svelte';
	import { Tab, Tabs, TabList, TabPanel } from '$lib/tabs';
	import ViewForm from '$lib/components/ViewForm.svelte';
	import ModifyForm from '$lib/components/ModifyForm.svelte';
	import { user, users } from '$lib/stores';
	import { beforeResCutoff, beforeCancelCutoff } from '$lib/reservationTimes';
	import { Settings } from '$lib/client/settings';
	import type { ReservationWithUser } from '$types';

	export let rsvs: ReservationWithUser[];
	export let hasForm: boolean;
	export let disableModify = false;
	export let onSubmit = () => null;

	const { close } = getContext('simple-modal');

	let viewOnly = (rsv) =>
		!beforeCancelCutoff(Settings, rsv.date, rsv.startTime, rsv.category) ||
		(!beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category) &&
			['autonomous', 'cbs'].includes(rsv.resType));

	let tabIndex = 0;
	const handleAdminSubmit = (event) => {
		onSubmit();
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
				<Tab>{rsv.Users?.nickname ?? $users[rsv.user].nickname}</Tab>
			{/each}
		</TabList>

		{#each rsvs as rsv}
			<TabPanel>
				{#if !disableModify && !viewOnly(rsv) && $user?.id === rsv.user}
					<ModifyForm {hasForm} {rsv} />
				{:else}
					<ViewForm {hasForm} bind:rsv on:submit={handleAdminSubmit} />
				{/if}
			</TabPanel>
		{/each}
	</Tabs>
</div>
