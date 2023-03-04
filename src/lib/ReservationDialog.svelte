<script>
    import { getContext } from 'svelte';
	import { fly } from 'svelte/transition';
	import Dialog from './Dialog.svelte';

    export let category;
    export let date;

    const { open } = getContext('simple-modal');

    let status = 0;

	const onCancel = (text) => {
		status = -1;
	}

	const onOkay = (data) => {
        status = 1;
        let str = '';
        for (const [key, value] of Object.entries(data)) {
            str += `${key}: ${value}\n`;   
        }
        alert(str); 
    }
    export const showDialog = () => {
		open(
			Dialog,
			{
                category: category,
				date: date,
                hasForm: true,
				onCancel,
				onOkay
			},
			{
				closeButton: false,
    		    closeOnEsc: false,
    		    closeOnOuterClick: false,
			}
	  );
	};
</script>

<div class="button_plus" on:click={showDialog} on:keypress={showDialog}></div>

<style>
    .button_plus {
      position: absolute;
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
