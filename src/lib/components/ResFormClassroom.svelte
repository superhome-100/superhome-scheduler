<script lang="ts">
	import { storedSettings } from '$lib/client/stores';
	import ResFormPool from '$lib/components/ResFormPool.svelte';
	import { minValidDateStr } from '$lib/reservationTimes';
	import type { ReservationEx, ReservationCategoryT } from '$types';

	export let rsv: ReservationEx | null = null;
	export let category: ReservationCategoryT = 'classroom';
	export let dayStr: string = rsv?.date || minValidDateStr($storedSettings, category);
	export let restrictModify = false;
	export let viewOnly = false;
	export let error = '';

	const maxNumStudents = 10;
	const maxTimeHours = 6;
</script>

<ResFormPool
	resType="course"
	{rsv}
	bind:dayStr
	bind:category
	{restrictModify}
	{viewOnly}
	{maxNumStudents}
	{maxTimeHours}
	{error}
/>
