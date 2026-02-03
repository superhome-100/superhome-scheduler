<script lang="ts">
	import { getContext } from 'svelte';
	import { enhance } from '$app/forms';
	import { syncMyIncomingReservations, users } from '$lib/stores';
	import { toast } from 'svelte-french-toast';
	import { popup } from '$lib/components/Popup.svelte';

	interface Reservation {
		id: string;
		date: string;
		category: string;
		startTime: string;
		endTime: string;
		owTime: string;
		buddies: string[];
	}

	export let rsv: Reservation;
	export let hasForm = false;

	type ModalContext = {
		close: () => void;
		hideModal: () => void;
	};
	const { close, hideModal } = getContext<ModalContext>('simple-modal');

	type ActionData = { error?: string };

	const cancelReservation = ({ formData }: { formData: FormData }) => {
		let buddies: string[] = JSON.parse(formData.get('buddies') as string);
		let cancelBuddies: string[] = [];
		for (let i = 0; i < buddies.length; i++) {
			if (formData.get('buddy-' + i) === 'on') {
				cancelBuddies.push(rsv.buddies[i]);
			}
			formData.delete('buddy-' + i);
		}
		formData.append('cancelBuddies', JSON.stringify(cancelBuddies));

		hideModal();

		return async ({ result }: { result: { type: string; data?: ActionData } }) => {
			switch (result.type) {
				case 'success':
					await syncMyIncomingReservations();
					toast.success('Reservation canceled');
					break;
				case 'failure':
					popup(result.data?.error || 'Unknown error');
					break;
				default:
					console.error(result);
					toast.error('Could not cancel reservation!');
					break;
			}
			close();
		};
	};
</script>

{#if hasForm}
	<div>
		<form method="POST" action="/?/cancelReservation" use:enhance={cancelReservation}>
			<input type="hidden" name="id" value={rsv.id} />
			<input type="hidden" name="date" value={rsv.date} />
			<input type="hidden" name="category" value={rsv.category} />
			<input type="hidden" name="startTime" value={rsv.startTime} />
			<input type="hidden" name="endTime" value={rsv.endTime} />
			<input type="hidden" name="owTime" value={rsv.owTime} />
			<input type="hidden" name="buddies" value={JSON.stringify(rsv.buddies)} />
			<div class="[&>span]:inline-block my-2 text-lg dark:text-white font-semibold mr-0.5">
				<span>Really cancel {rsv.category} reservation on</span>
				<span>{rsv.date}?</span>
			</div>
			{#each rsv.buddies as buddy, i}
				<div>
					<label class="dark:text-white"
						>Also cancel {$users[buddy].nickname}'s reservation
						<input type="checkbox" name={'buddy-' + i} />
					</label>
				</div>
			{/each}
			<button class="dark:text-white dark:border-white mb-2" type="submit">Confirm</button>
		</form>
	</div>
{/if}
