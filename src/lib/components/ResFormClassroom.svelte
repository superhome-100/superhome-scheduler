<script>
    import ResFormPool from '$lib/components/ResFormPool.svelte';

    export let rsv = null;
    export let disabled = false;
    export let category;
    export let date;
</script>

<ResFormPool resType="course" rsv={rsv} date={date} bind:category={category} disabled={disabled}/>
