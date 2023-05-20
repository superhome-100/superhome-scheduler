<script>
	import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
	import TrashIcon from './TrashIcon.svelte';

	export let rsv;

	const { open } = getContext('simple-modal');

	const showCancel = () => {
		open(
			CancelForm,
			{
				rsv: rsv,
				hasForm: true
			},
			{
				closeButton: false
			}
		);
	};
</script>

<button on:click={showCancel} class="p-1 bg-white/50 rounded-[50%]">
	<TrashIcon />
</button>
