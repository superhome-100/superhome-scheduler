<script>
	import { goto } from '$app/navigation';
	import { viewedDate } from '$lib/stores';
	import { PanglaoDate } from '$lib/datetimeUtils';

	export let date;
	export let rsvs;
	export let category;

	function handleClick() {
		$viewedDate = date;
		goto('/single-day/{category}');
	}

	const dateStyle = (date) => {
		let today = PanglaoDate();
		if (
			date.getFullYear() == today.getFullYear() &&
			date.getMonth() == today.getMonth() &&
			date.getDate() == today.getDate()
		) {
			return 'rounded-[50%] bg-stone-300 dark:bg-stone-600';
		} else {
			return '';
		}
	};
	const numDivers = (rsvs, owTime) => {
		if (owTime) {
			return rsvs
				.filter((rsv) => rsv.owTime === owTime)
				.reduce(
					(n, rsv) => (rsv.resType === 'course' ? n + 1 + rsv.numStudents : n + 1),
					0
				);
		} else {
			return rsvs.reduce(
				(n, rsv) => (rsv.resType === 'course' ? n + 1 + rsv.numStudents : n + 1),
				0
			);
		}
	};
</script>

<div class="overflow-hidden h-full">
	<a class="no-underline" href="/single-day/{category}">
		<div class="h-full" on:click={handleClick} on:keypress={handleClick}>
			<p class="flex justify-center w-6 m-auto {dateStyle(date)}">
				{date.getDate()}
			</p>
			{#if rsvs.length > 0}
				{#if category === 'openwater'}
					{#each ['AM', 'PM'] as owTime}
						<div
							class="mx-auto first-of-type:mt-2 first-of-type:mb-1 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv {category}"
						>
							+{numDivers(rsvs, owTime)}
						</div>
					{/each}
				{:else}
					<div
						class="mx-auto mt-4 flex items-center justify-center text-sm rounded-xl h-6 w-10 rsv {category}"
					>
						+{numDivers(rsvs)}
					</div>
				{/if}
			{/if}
		</div>
	</a>
</div>
