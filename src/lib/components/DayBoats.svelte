<script>
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { datetimeToLocalDateStr } from '$lib/datetimeUtils.js';
    import { user, buoys, viewedDate } from '$lib/stores.js';
    import { Settings } from '$lib/settings.js';
    
    $: boats = Settings.get('boats', datetimeToLocalDateStr($viewedDate));
    $: captains = Settings.get('captains', datetimeToLocalDateStr($viewedDate));

    onMount(() => {
        if ($user.privileges !== 'admin') {
            goto('/');
        }
    });
</script>

{#if $user.privileges === 'admin'}
    <table class='table-fixed w-full [&_td]:text-center [&_td]:mx-auto [&_td]:h-12 [&_input[type]]:m-0'>
        <tbody>
            <tr>
                <td/>
                {#each boats as boat}
                    <td>{boat}</td>
                {/each}
            </tr>
            {#each captains as captain}
                <tr>
                    <td>{captain}</td>
                    {#each boats as boat}
                        <td><input type='radio' id={boat} name={captain} value={boat}></td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
    <table class='table-fixed w-full [&_td]:text-center [&_td]:mx-auto [&_td]:h-12 [&_input[type]]:m-0'>
        <tbody>
            <tr>
                <td/>
                {#each boats as boat}
                    <td>{boat}</td>
                {/each}
            </tr>
            {#each $buoys as buoy}
                <tr>
                    <td>{buoy.name}</td>
                    {#each boats as boat}
                        <td><input type='radio' id={boat} name={buoy} value={boat}></td>
                    {/each}
                </tr>
            {/each}
        </tbody>
    </table>
{/if}
