<script>
    import { createEventDispatcher } from 'svelte';
    export let date;
    let id_internal = null;
    export {id_internal as id};

    const dispatch = createEventDispatcher();

    function handleClick() {
        dispatch('selectDay', {
            date: date
        });
    }

</script>

<div style="width: 100%; height: 100%" on:click={handleClick} on:keypress={handleClick}>
    <p style="margin: auto; width: 25px; text-align: center" id={id_internal}>{date}</p>
</div>


