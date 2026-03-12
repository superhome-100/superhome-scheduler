<script lang="ts">
	import { displayTag, badgeColor, buoyDesc } from '$lib/utils';
	import { storedBuoysActive, storedUser as user } from '$lib/client/stores';
	import _ from 'lodash';

	import { toast } from 'svelte-french-toast';
	import type { TempSubmission } from '$lib/autoAssign';
	import type { SupabaseClient } from '$types';

	export let supabase: SupabaseClient;
	export let submissions: TempSubmission[];
	export let adminView: boolean = false;

	export let onClick: (e: MouseEvent) => void = () => {};

	export let adminComment: string = '';

	const curUserStyling = (rsv: TempSubmission) => {
		if (rsv.user === $user?.id) {
			return 'border border-transparent rounded bg-lime-300 text-black';
		} else {
			return '';
		}
	};

	const adminBuoyUpdate = async (event: SubmitEvent, rsv: TempSubmission) => {
		const fn = async () => {
			const formData = new FormData(event.target as HTMLFormElement);
			const buoy = formData.get('buoy') as string;
			if (!buoy) throw Error(`Wrong input ${buoy}`);
			await supabase
				.from('Reservations')
				.update({ buoy })
				.eq('id', rsv.id)
				.eq('buoy', rsv.buoy) // prevents race condition
				.select('id')
				.single()
				.throwOnError();
		};
		await toast
			.promise(fn(), {
				loading: `Updating reservation of '${rsv.user_json.nickname}'...`,
				success: `Successfully updated reservation of '${rsv.user_json.nickname}'`,
				error: (e) => `Update failed: '${e.message}'`
			})
			.catch((e) => console.error('adminBuoyUpdate', e));
	};
</script>

{#if submissions.length}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<div class="text-center w-full" on:click={onClick}>
		<div
			class="bg-gradient-to-br from-openwater-bg-from to-openwater-bg-to text-openwater-fg py-0.5 sm:py-2 pr-1 flex flex-col rounded-md cursor-pointer text-sm"
		>
			{#each _.sortBy(submissions, 'user') as rsv (rsv.id)}
				<div class="flex items-center w-full px-2">
					<div class="flex-1 text-xs lg:text-base {curUserStyling(rsv)} overflow-auto break-all">
						{displayTag(rsv, adminView)}
						<!-- {#if adminView && rsv._autoAssignReason}
							<div
								class="desktop-text text-[0.65rem] opacity-80 italic leading-tight text-left mt-0.5"
							>
								{rsv._autoAssignReason}
							</div>
						{/if} -->
					</div>
					{#if adminView}
						<div class="desktop-text px-1" on:click|stopPropagation on:keydown|stopPropagation>
							<form on:submit|preventDefault={(e) => adminBuoyUpdate(e, rsv)}>
								<input type="hidden" name="id" value={rsv.id} />
								<select
									name="buoy"
									class="text-xs bg-white text-black py-0 px-1 rounded border-0 h-6 w-20"
									on:change={(e) => e.target.form.requestSubmit()}
								>
									<option value="auto" selected={rsv.buoy === 'auto'}>Auto</option>
									{#each $storedBuoysActive as b (b.name)}
										<option value={b.name} selected={rsv.buoy === b.name}
											>{b.name} - {buoyDesc(b)}</option
										>
									{/each}
								</select>
							</form>
						</div>
					{/if}
					<div class="pl-1 w-1">
						<span class="rsv-indicator {badgeColor([rsv])}" />
					</div>
				</div>
			{/each}

			{#if adminComment}
				<p class="flex flex-col text-sm p-0 text-gray-200">
					ADMIN: {adminComment}
				</p>
			{/if}
		</div>
	</div>
{/if}
