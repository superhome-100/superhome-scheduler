<script>
	import { goto } from '$app/navigation';
	import { view, viewedDate } from '$lib/stores.js';

	export let date;
	export let rsvs;
	export let category;

	const nDisplay = 3;

	function handleClick() {
		$viewedDate = date;
		goto('/single-day/{category}');
	}

	function getDisplayTags(rsvs) {
		let tags = [];
		let N = rsvs.length > nDisplay + 1 ? nDisplay : rsvs.length;
		for (let i = 0; i < N; i++) {
			let tag = rsvs[i].user.name;
			if (rsvs[i].resType === 'course') {
				tag += ' +' + rsvs[i].numStudents;
			}
			tags.push(tag);
		}
		if (rsvs.length > N) {
			let lastTag = '+ ' + (rsvs.length - N) + ' more...';
			tags.push(lastTag);
		}
		return tags;
	}

	const catBg = (cat) =>
		cat === 'pool'
			? 'bg-pool-bg-to'
			: cat === 'openwater'
			? 'bg-openwater-bg-to'
			: cat === 'classroom'
			? 'bg-classroom-bg-to'
			: undefined;

	const dateStyle = (date) => {
		let today = new Date();
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
				.reduce((n, rsv) => (rsv.resType === 'course' ? n + 1 + rsv.numStudents : n + 1), 0);
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
