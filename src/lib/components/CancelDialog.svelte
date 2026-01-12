<script lang="ts">
	import { getContext } from 'svelte';
	import CancelForm from './CancelForm.svelte';
	import TrashIcon from './TrashIcon.svelte';

	interface Reservation {
		id: string;
		[key: string]: any;
	}

	export let rsv: Reservation;

	type ModalContext = {
		open: (component: any, props?: Record<string, any>, options?: { closeButton: boolean }) => void;
	};
	const { open } = getContext<ModalContext>('simple-modal');

	const showCancel = (): void => {
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
