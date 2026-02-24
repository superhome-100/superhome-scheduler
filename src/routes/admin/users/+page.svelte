<script lang="ts">
	import {
		storedPriceTemplates,
		storedUsersForAdmin,
		storedUsersForAdminLoading
	} from '$lib/client/stores';
	import LoadingBar from '$lib/components/LoadingBar.svelte';
	import { PanglaoDayJs } from '$lib/datetimeUtils';
	import { Constants, type TablesUpdate } from '$lib/supabase.types';
	import type { UserWithPriceTemplate } from '$types';
	import toast from 'svelte-french-toast';

	export let data;
	const { supabase } = data;

	let draftUser: (UserWithPriceTemplate & { priceTemplate: string }) | null = null;

	function toggleRow(user: UserWithPriceTemplate) {
		if (draftUser?.id === user.id) {
			draftUser = null;
		} else {
			draftUser = {
				...user,
				// this `?? regular` magis is based on "public"."ReservationsWithPrices" view
				priceTemplate: user.UserPriceTemplates?.priceTemplate ?? 'regular'
			};
		}
	}

	async function handleSave() {
		if (!draftUser) return;

		const payload: TablesUpdate<'Users'> = {
			name: draftUser.name,
			nickname: draftUser.nickname,
			email: draftUser.email,
			privileges: draftUser.privileges,
			status: draftUser.status
		};

		const fn = async () => {
			if (!draftUser) throw Error();
			const { data: result } = await supabase
				.from('Users')
				.update(payload)
				.eq('id', draftUser.id)
				.select('id')
				.maybeSingle()
				.throwOnError();

			if (result === null) throw Error('User record missing');

			if (draftUser.UserPriceTemplates?.priceTemplate !== draftUser.priceTemplate) {
				await supabase
					.from('UserPriceTemplates')
					.upsert({ user: draftUser.id, priceTemplate: draftUser.priceTemplate })
					.single()
					.throwOnError();
			}

			// Cleanup on success
			draftUser = null;
		};

		toast.promise(fn(), {
			loading: `Updating ${draftUser.name}...`,
			success: `Successfully updated ${draftUser.name}`,
			error: (e) => `Update failed: ${e.message}`
		});
	}

	const limitList = 100;
	let searchTerm = '';
	let statusFilter = '';
	$: searchTermLower = searchTerm.toLowerCase();
	$: filteredUsers = $storedUsersForAdmin
		.filter(
			(user) =>
				!searchTerm ||
				user.name.toLowerCase().includes(searchTermLower) ||
				user.nickname?.toLowerCase().includes(searchTermLower) ||
				user.email?.toLowerCase().includes(searchTermLower)
		)
		.filter((u) => !statusFilter || statusFilter === u.status)
		.slice(0, limitList)
		.map((u) => {
			const uu = { ...u, _createdAt: PanglaoDayJs(u.createdAt) };
			return uu;
		});

	function handleKeydown(e: any, element: HTMLElement | null) {
		const searchInput = element as HTMLInputElement;
		const { target, key, ctrlKey, metaKey, altKey } = e;
		const isEditable =
			target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
		if (isEditable) return;
		if (ctrlKey || metaKey || altKey) return;
		switch (key) {
			case 'Backspace':
				searchInput.focus();
				return;
			case 'Enter':
				return;
		}
		// Unicode & Alphanumeric Filter: key.length === 1 identifies printable characters across all languages
		if (key.length === 1) {
			searchInput.focus();
		}
	}
</script>

<svelte:window on:keydown={(e) => handleKeydown(e, document.getElementById('searchTerm'))} />

<div class="admin-view">
	<input
		id="searchTerm"
		type="text"
		placeholder="Search for name, nickname or email..."
		bind:value={searchTerm}
		class="search-input"
	/>
	<select bind:value={statusFilter} class="search-input">
		<option value="" selected>Status</option>
		{#each Constants['public']['Enums']['user_status'] as status}
			<option value={status}>{status}</option>
		{/each}
	</select>

	{#if $storedUsersForAdminLoading}
		<LoadingBar />
	{:else}
		<table class="content-table">
			<thead>
				<tr>
					<th>Nickname /<br />Name</th>
					<th>Created At</th>
					<th class="actions-col">Management</th>
				</tr>
			</thead>
			<tbody>
				{#each filteredUsers as user (user.id)}
					<tr
						class="main-row"
						class:expanded={draftUser?.id === user.id}
						on:click={() => toggleRow(user)}
					>
						<td
							>{user.nickname}
							{#if user.nickname !== user.name}
								/<br /><span class="second-line">{user.name}</span>
							{/if}</td
						>
						<td
							>{user._createdAt.format('DD MMM YYYY')}<br />
							{user._createdAt.format('HH:mm ddd')}</td
						>
						<td class="actions-col">
							<button class={user.status}>
								{user.status}
							</button>
						</td>
					</tr>

					{#if draftUser?.id === user.id && draftUser}
						<tr class="details-row">
							<td colspan="3">
								<div class="editor-panel">
									<div class="field-grid">
										<label>Full Name <input type="text" bind:value={draftUser.name} /></label>
										<label>Nickname <input type="text" bind:value={draftUser.nickname} /></label>
										<label>Email Address <input type="email" bind:value={draftUser.email} /></label>

										<label>
											Privileges
											<select bind:value={draftUser.privileges}>
												{#each Constants['public']['Enums']['user_privilege'] as priv}
													<option value={priv}>{priv}</option>
												{/each}
											</select>
										</label>

										<label>
											Status
											<select bind:value={draftUser.status} class={draftUser.status}>
												{#each Constants['public']['Enums']['user_status'] as status}
													<option value={status}>{status}</option>
												{/each}
											</select>
										</label>

										<label>
											Price Template
											<select bind:value={draftUser.priceTemplate}>
												{#each $storedPriceTemplates as priceTemplate}
													<option value={priceTemplate.id}>{priceTemplate.id}</option>
												{/each}
											</select>
										</label>

										<label
											>Created At <input type="text" value={draftUser.createdAt} readonly /></label
										>
										<label
											>Updated At <input type="text" value={draftUser.updatedAt} readonly /></label
										>
										<label
											>Auth Provider <input
												type="text"
												value={draftUser.authProvider}
												readonly
											/></label
										>
										<label>User UUID <input type="text" value={draftUser.id} readonly /></label>
									</div>

									<div class="control-strip">
										<button class="btn-save" on:click={handleSave}>Apply Changes</button>
										<button
											class="btn-cancel"
											on:click={() => {
												draftUser = null;
											}}>Discard</button
										>
									</div>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
		{#if searchTerm == '' && $storedUsersForAdmin.length > limitList}
			... this list is not complete, use search bar ...
		{/if}
	{/if}
</div>

<style>
	@import '../style.css';

	.active {
		background-color: #1e6f39 !important;
		width: 100%;
	}
	.disabled {
		background-color: #b87255 !important;
		width: 100%;
	}
</style>
