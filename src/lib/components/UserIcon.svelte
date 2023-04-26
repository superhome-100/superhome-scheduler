<script>
    import { getContext } from 'svelte';
    import Nickname from '$lib/components/Nickname.svelte';
    import { user } from '$lib/stores.js';

    export let profileSrc = null;

    const { open } = getContext('simple-modal');

    const showUpdateForm = () => {
        open(Nickname);
    };
    
</script>

<div on:click={showUpdateForm}>
    {#if profileSrc}
        <img class='rounded-[50%] w-10' alt="profilePicture" src={profileSrc}>
    {:else}
        <div class='text-xs'>{$user.nickname}</div>
    {/if}
</div>


