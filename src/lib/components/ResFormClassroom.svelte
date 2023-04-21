<script>
    import ResFormPool from '$lib/components/ResFormPool.svelte';

    export let rsv = null;
    export let category = 'classroom';
    export let date;
    export let dateFn = null;
    export let restrictModify = false;
    export let viewOnly = false;
    const maxNumStudents = 10;

</script>

<ResFormPool resType="course" {rsv} bind:date={date} {dateFn} bind:category={category} {restrictModify} {viewOnly} {maxNumStudents}/>
