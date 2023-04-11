<script>
    import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
    import ModifyForm from './ModifyForm.svelte';
    import { reservations } from '$lib/stores.js';
    import DeleteIcon from './DeleteIcon.svelte';
    import EditIcon from './EditIcon.svelte';

    export let rsv;
    export let dialogType;
    let icon = dialogType === 'modify' ? '/' : 'X';
    
    const { open } = getContext('simple-modal');

    const showModify = () => {
		open(
			ModifyForm,
            {
                rsv: rsv, 
                hasForm: true,
            }
		);
    };
    const showCancel = () => {
        open(
            CancelForm,
            {
                rsv: rsv,
                hasForm: true,
            },
            {
                closeButton: false,
            },
        );
    };
    export const showDialog = dialogType === 'modify' ? showModify : showCancel;
    const iconStyle = 'w-4 h-4';
</script>

<button on:click={showDialog} class='p-1 bg-white/50 rounded-[50%]'>
    {#if dialogType === 'modify'}
        <EditIcon {iconStyle}/>
    {:else if dialogType === 'cancel'}
        <DeleteIcon {iconStyle}/>
    {/if}
</button>

