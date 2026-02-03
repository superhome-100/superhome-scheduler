<script lang="ts">
	import { adminComments, updateOWState } from '$lib/stores';
	import { datetimeToLocalDateStr } from '$lib/datetimeUtils';
	import { OWTime } from '$types';
	import { enhance } from '$app/forms';
	import { getContext } from 'svelte';
	import { toast } from 'svelte-french-toast';
	import type { BuoyGroupings } from '$lib/server/xata.codegen';

	export let date: string;
	export let buoy: string;

	const { close } = getContext('simple-modal');

	const getThisRsvAdminComments = (
		date: string,
		buoy: string,
		owTime: string,
		adminComments: Record<string, BuoyGroupings[]>
	) => {
		if (adminComments[date]) {
			for (let ac of adminComments[date]) {
				if (ac.buoy == buoy && ac.am_pm == owTime) {
					return ac.comment;
				}
			}
		}
		return '';
	};

	$: owTime = OWTime.AM;

	const adminCommentUpdate = async ({ form, formData, action, cancel }) => {
		close();
		return async ({ result, update }) => {
			switch (result.type) {
				case 'success':
					const acRec = result.data.record;
					const date = datetimeToLocalDateStr(acRec.date);
					for (let i = 0; i < $adminComments[date].length; i++) {
						if ($adminComments[date][i].id == acRec.id) {
							$adminComments[date].splice(i, 1);
							break;
						}
					}
					if (acRec.comment) {
						$adminComments[date].push(acRec);
					}
					$adminComments = { ...$adminComments };

					updateOWState(date, 'adminComments');
					break;
				default:
					console.error(result);
					toast.error('Update failed with unknown error!');
					break;
			}
		};
	};
</script>

<form method="POST" action="/?/adminCommentUpdate" use:enhance={adminCommentUpdate}>
	<div class="form-title">buoy {buoy}</div>
	<input type="hidden" name="date" value={date} />
	<input type="hidden" name="buoy" value={buoy} />
	<div class="row m-4">
		<div class="column text-right w-[33%]">
			<div class="form-label h-8 mb-0.5">
				<label for="owTime" class="dark:text-white">owTime</label>
			</div>
			<div class="form-label h-8 mb-0.5">
				<label for="admin_comments" class="dark:text-white">Comments</label>
			</div>
		</div>
		<div class="column w-[67%]">
			<div>
				<select id="owTime" name="owTime" bind:value={owTime}>
					<option value={OWTime.AM}>AM</option>
					<option value={OWTime.PM}>PM</option>
				</select>
			</div>
			<div>
				<textarea
					id="adminComments"
					name="admin_comments"
					class="w-44 xs:w-52 flex-1 text-gray-700 dark:text-white"
					value={getThisRsvAdminComments(date, buoy, owTime, $adminComments)}
					tabindex="4"
				/>
			</div>
		</div>
		<div class="w-full inline-flex items-center justify-end">
			<button type="submit" class="bg-gray-100 mt-1 px-3 py-1">Update</button>
		</div>
	</div>
</form>
