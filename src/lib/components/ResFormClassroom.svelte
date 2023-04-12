<script>
    import ResFormPool from '$lib/components/ResFormPool.svelte';

    export let rsv = null;
    export let disabled = false;
    export let category;
    export let date;
    export let hideSubmit = false;
</script>

<ResFormPool resType="course" {rsv} {date} bind:category={category} {disabled} {hideSubmit}/>
