<script>
    import ResFormPool from '$lib/components/ResFormPool.svelte';

    export let rsv = null;
    export let category;
    export let date;
    export let dateFn;
    export let restrictModify = false;
    export let viewOnly = false;
</script>

<ResFormPool resType="course" {rsv} bind:date={date} {dateFn} bind:category={category} {restrictModify} {viewOnly}/>
