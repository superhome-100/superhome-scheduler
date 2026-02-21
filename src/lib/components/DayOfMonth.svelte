<script lang="ts">
	import { type DateReservationSummary, ReservationCategory } from '$types';
	import dayjs from 'dayjs';

	import { getCategoryDatePath } from '$lib/url';
	import { storedSettings } from '$lib/client/stores';
	import type { SettingsManager } from '$lib/settings';

	export let date: string;
	export let category: ReservationCategory;
	export let summary: DateReservationSummary;

	$: isOpen = ((sm: SettingsManager) => {
		if (!sm.get('openForBusiness', date)) return false;
		switch (category) {
			case ReservationCategory.pool:
				return sm.get('poolBookable', date);
			case ReservationCategory.classroom:
				return sm.get('classroomBookable', date);
			case ReservationCategory.openwater:
				return sm.get('openwaterAmBookable', date) || sm.get('openwaterPmBookable', date);
			default:
				throw Error(`assert: unknown ${category}`);
		}
	})($storedSettings);
</script>

<div
	class="overflow-hidden h-full {dayjs(date).isSame(dayjs(), 'date') &&
		'bg-stone-300 dark:bg-stone-600'}"
>
	<a class="no-underline" href={getCategoryDatePath(category, date)}>
		<div class="h-full {isOpen ? '' : 'closed-day'}">
			<p
				class="flex justify-center w-6 m-auto {dayjs(date).isSame(dayjs(), 'date') &&
					'rounded-[50%] bg-stone-100 dark:bg-stone-800'}"
			>
				{dayjs(date).get('date')}
			</p>
			{#if summary}
				{#if category === 'openwater' && summary.openwater.AM + summary.openwater.PM > 0}
					<div
						class="mx-auto first-of-type:mt-2 first-of-type:mb-1 flex items-center justify-center text-sm rounded-xl h-6 w-10 md:w-16 px-1 rsv {category}"
					>
						<span style="color: {summary.openwater.ow_am_full ? 'red' : ''}">
							<span class="hidden md:inline">AM</span>
							+{summary.openwater.AM}
						</span>
					</div>
					<div
						class="mx-auto first-of-type:mt-2 first-of-type:mb-1 flex items-center justify-center text-sm rounded-xl h-6 w-10 md:w-16 px-1 rsv {category}"
					>
						<span class="hidden md:inline">PM</span>
						+{summary.openwater.PM}
					</div>
				{/if}

				{#if category === 'pool' && summary.pool}
					<div
						class="mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv {category}"
					>
						+{summary.pool}
					</div>
				{/if}

				{#if category === 'classroom' && summary.classroom}
					<div
						class="mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv {category}"
					>
						+{summary.classroom}
					</div>
				{/if}
			{/if}
		</div>
	</a>
</div>

<style>
	.closed-day {
		background-image: url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><text y='24' font-size='24'>🔒</text></svg>");
		background-repeat: no-repeat;
	}
</style>
