<script lang="ts">
	import { OWTime } from '$types';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import { enhance } from '$app/forms';
	import { beforeResCutoff } from '$lib/reservationTimes';
	import ResFormPool from './ResFormPool.svelte';
	import ResFormClassroom from './ResFormClassroom.svelte';
	import ResFormOpenWater from './ResFormOpenWater.svelte';
	import { popup } from './Popup.svelte';
	import { users, reservations } from '$lib/stores';
	import { Settings } from '$lib/settings';
	import { removeRsv, cleanUpFormDataBuddyFields } from '$lib/utils.js';

	export let hasForm = false;
	export let rsv;

	let error = '';
	const { close, hideModal, showModal } = getContext('simple-modal');

	const reservationChanged = (formData, original) => {
		const checkString = (field) => {
			return formData.has(field) && formData.get(field) != original[field];
		};
		const checkNumber = (field) => {
			return formData.has(field) && parseInt(formData.get(field)) != original[field];
		};
		const checkBool = (field) => {
			return formData.has(field) && (formData.get(field) == 'on') != original[field];
		};

		let buddies = JSON.parse(formData.get('buddies'));
		let union = new Set([...buddies, ...original.buddies]);
		if (union.size > buddies.length || union.size > original.buddies.length) {
			return true;
		}
		if (formData.has('owTime')) {
			let owTime = OWTime[formData.get('owTime') as keyof typeof OWTime];
			if (owTime != original.owTime) {
				return true;
			}
		}
		if (formData.has('pulley')) {
			if ((formData.get('pulley') == 'on') != original.pulley) {
				return true;
			}
		} else if (original.pulley != null) {
			return true;
		}

		return (
			checkString('date') ||
			checkString('comments') ||
			checkNumber('numStudents') ||
			checkString('startTime') ||
			checkString('endTime') ||
			checkNumber('maxDepth') ||
			checkBool('extraBottomWeight') ||
			checkBool('bottomPlate') ||
			checkBool('largeBuoy') ||
			checkBool('O2OnBuoy')
		);
	};

	const modifyReservation = async ({ data, cancel }) => {
		error = '';
		cleanUpFormDataBuddyFields(data);
		if (!reservationChanged(data, rsv)) {
			cancel();
			close();
			return;
		}
		hideModal();

		return async ({ result }) => {
			let records;
			switch (result.type) {
				case 'success':
					records = result.data.records;
					for (let rsv of records.modified) {
						let user = $users[rsv.user.id];
						removeRsv(rsv.id);
						$reservations.push(rsv);
					}
					for (let rsv of records.created) {
						let user = $users[rsv.user.id];
						$reservations.push(rsv);
					}
					for (let rsv of records.canceled) {
						removeRsv(rsv.id);
					}
					$reservations = [...$reservations];
					toast.success('Reservation updated!');
					close();
					break;
				case 'failure':
					error = result.data.error;
					showModal();
					toast.error('Reservation rejected!');
					console.error(result);
					break;
				default:
					showModal();
					console.error(result);
					toast.error('Update failed with unknown error!');
					break;
			}
		};
	};

	let restrictModify = !beforeResCutoff(Settings, rsv.date, rsv.startTime, rsv.category);
</script>

{#if hasForm}
	<div>
		<div class="form-title">modify reservation</div>
		<form method="POST" action="/?/modifyReservation" use:enhance={modifyReservation}>
			<input type="hidden" name="id" value={rsv.id} />
			{#if rsv.category === 'pool'}
				<ResFormPool {restrictModify} {rsv} {error} />
			{:else if rsv.category === 'openwater'}
				<ResFormOpenWater {restrictModify} {rsv} {error} />
			{:else if rsv.category === 'classroom'}
				<ResFormClassroom {rsv} {error} />
			{/if}
		</form>
	</div>
{/if}
