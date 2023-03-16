<script>
    import { view, viewedDate } from '$lib/stores.js';
    
    export let date;
    export let rsvs;
    let id_internal = null;
    export {id_internal as id};
    export let category;

    function handleClick() {
        $viewedDate = date;
        $view = 'single-day';
    }

</script>

<a href="/single-day/{category}" style="text-decoration: none">
    <div style="height:100%" on:click={handleClick} on:keypress={handleClick}>
        <p 
            style="margin: auto; width: 25px; text-align: center" 
            id={id_internal}>{date.getDate()}
        </p>
        {#each rsvs as rsv}
            <p class="rsv">{rsv.user.name}</p>
        {/each}
    </div>
</a>
