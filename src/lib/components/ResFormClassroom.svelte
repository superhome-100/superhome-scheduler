<script>
	import ResFormPool from '$lib/components/ResFormPool.svelte';

	export let rsv = null;
	export let category = 'classroom';
	export let date;
	export let dateFn = null;
	export let restrictModify = false;
	export let viewOnly = false;
	const maxNumStudents = 10;
	const maxTimeHours = 6;
</script>

<ResFormPool
	resType="course"
	{rsv}
	bind:date
	{dateFn}
	bind:category
	{restrictModify}
	{viewOnly}
	{maxNumStudents}
	{maxTimeHours}
/>
