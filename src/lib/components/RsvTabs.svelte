<script lang="ts">
	import { getContext } from 'svelte';
	import { Tab, Tabs, TabList, TabPanel } from '$lib/tabs';
	import ViewForm from '$lib/components/ViewForm.svelte';
	import ModifyForm from '$lib/components/ModifyForm.svelte';
	import { storedSettings, storedUser as user } from '$lib/client/stores';
	import { storedUsers as users } from '$lib/client/stores';
	import { beforeResCutoff, beforeCancelCutoff } from '$lib/reservationTimes';

	import type { Reservation, ReservationEx } from '$types';
	import type { SettingsManager } from '$lib/settings';

	export let rsvs: ReservationEx[];
	export let hasForm: boolean;
	export let disableModify = false;
	export let onSubmit = () => null;

	const { close } = getContext('simple-modal');

	let viewOnly = (sm: SettingsManager, rsv: Reservation) =>
		!beforeCancelCutoff(sm, rsv.date, rsv.startTime, rsv.category) ||
		(!beforeResCutoff(sm, rsv.date, rsv.startTime, rsv.category) &&
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
				<Tab>{rsv.user_json?.nickname ?? $users[rsv.user].nickname}</Tab>
			{/each}
		</TabList>

		{#each rsvs as rsv}
			<TabPanel>
				{#if !disableModify && !viewOnly($storedSettings, rsv) && $user?.id === rsv.user}
					<ModifyForm {hasForm} {rsv} />
				{:else}
					<ViewForm {hasForm} bind:rsv on:submit={handleAdminSubmit} />
				{/if}
			</TabPanel>
		{/each}
	</Tabs>
</div>
