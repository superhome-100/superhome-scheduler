<script>
    import { getContext } from 'svelte';
	import ReservationForm from './ReservationForm.svelte';
    import { reservations } from '$lib/stores.js';

    export let category='openwater';
    export let dateFn;

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
        position: sticky;
        width: 35px;
        height: 35px;
        background: #fff;
        cursor: pointer;
        border: 2px solid #095776;
        top: 10%;
        left: 90%;
    }

    .button_plus:after {
        position: absolute;
        content: '';
        transform: translate(-50%, -50%);
        height: 4px;
        width: 50%;
        background: #095776;
        top: 50%;
        left: 50%;
    }

    .button_plus:before {
        position: absolute;
        content: '';
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #095776;
        height: 50%;
        width: 4px;
    }

    .button_plus:hover:before,
    .button_plus:hover:after {
        background: #fff;
        transition: 0.2s;
    }

    .button_plus:hover {
        background-color: #095776;
        transition: 0.2s;
    }

</style>
