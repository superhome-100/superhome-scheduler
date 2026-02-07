<script lang="ts">
	import type { ReservationCategory, DateReservationSummary } from '$types';
	import dayjs from 'dayjs';

	import { getCategoryDatePath } from '$lib/url';

	export let date: Date | string;
	export let category: ReservationCategory;
	export let summary: DateReservationSummary;
</script>

<div
	class="overflow-hidden h-full {dayjs(date).isSame(dayjs(), 'date') &&
		'bg-stone-300 dark:bg-stone-600'}"
>
	<a class="no-underline" href={getCategoryDatePath(category, date)}>
		<div class="h-full">
			<p
				class="flex justify-center w-6 m-auto {dayjs(date).isSame(dayjs(), 'date') &&
					'rounded-[50%] bg-stone-100 dark:bg-stone-800'}"
			>
				{dayjs(date).get('date')}
			</p>
			{#if summary}
				{#if category === 'openwater' && summary.openwater.total}
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
