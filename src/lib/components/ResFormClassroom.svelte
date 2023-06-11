<script lang="ts">
	import ResFormPool from '$lib/components/ResFormPool.svelte';
	import type { ReservationData } from '$types';

	export let rsv: ReservationData;
	export let category = 'classroom';
	export let date: Date | null = null;
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
