<script>
    import { getContext } from 'svelte';
	import ReservationForm from './ReservationForm.svelte';
    import { reservations } from '$lib/stores.js';
    import { minValidDateStr } from '$lib/ReservationTimes.js';

    export let category = 'openwater';
    
    /* require date to be a fn to enable lazy evaluation since it 
    might depend on values from the database, which may not have
    loaded by the time the page renders, e.g. immediately after 
    a refresh */
    export let dateFn = minValidDateStr; 
    
    const { open } = getContext('simple-modal');

    export const showDialog = () => {
		open(
			ReservationForm,
			{
                category: category,
				date: dateFn(),
                hasForm: true,
			}
		);
	};
</script>

<div class="button_plus" on:click={showDialog} on:keypress={showDialog}></div>

<style>
    .button_plus {
        position: relative;
        width: 35px;
        height: 35px;
        background: #fff;
        cursor: pointer;
        border: 2px solid #1254A7;
        top: 0%;
        left: 50%;
    }

    .button_plus:after {
        position: absolute;
        content: '';
        transform: translate(-50%, -50%);
        height: 4px;
        width: 50%;
        background: #1254A7;
        top: 50%;
        left: 50%;
    }

    .button_plus:before {
        position: absolute;
        content: '';
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1254A7;
        height: 50%;
        width: 4px;
    }

    .button_plus:hover:before,
    .button_plus:hover:after {
        background: #fff;
        transition: 0.2s;
    }

    .button_plus:hover {
        border: 2px solid white;
        background-color: #1254A7;
        transition: 0.2s;
    }

</style>
