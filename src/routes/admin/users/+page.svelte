<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
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

		const user = draftUser;

		const payload: TablesUpdate<'Users'> = {
			name: user.name,
			nickname: user.nickname,
			email: user.email,
			privileges: user.privileges,
			status: user.status
		};

		const fn = async () => {
			if (!user) throw Error();
			const { data: result } = await supabase
				.from('Users')
				.update(payload)
				.eq('id', user.id)
				.select('id')
				.maybeSingle()
				.throwOnError();

			if (result === null) throw Error('User record missing');

			if (user.UserPriceTemplates?.priceTemplate !== user.priceTemplate) {
				await supabase
					.from('UserPriceTemplates')
					.upsert({ user: user.id, priceTemplate: user.priceTemplate })
					.single()
					.throwOnError();
			}

			// Cleanup on success
			draftUser = null;
		};

		return toast.promise(fn(), {
			loading: `Updating ${user.name}...`,
			success: `Successfully updated ${user.name}`,
			error: (e) => `Update failed: ${e.message}`
		});
	}

	async function deleteUser() {
		if (!draftUser) return;

		const user = draftUser;

		const confirmed = window.confirm(
			`Are you sure you want to delete:\n${user.name} / ${user.nickname}\n?`
		);

		if (!confirmed) return;

		const fn = async () => {
			if (!user) throw Error('assert');

			const { data, error } = await supabase
				.from('Users')
				.delete()
				.eq('id', user.id)
				.select()
				.maybeSingle();

			if (error?.message.indexOf('"reservations_user_key"') !== -1) {
				throw Error(`User '${user.name}' has reservation(s), cannot be deleted`);
			} else if (error) {
				throw error;
			}

			if (!data) throw Error("Could't delete user!");

			// Cleanup on success
			draftUser = null;
		};

		return toast.promise(fn(), {
			loading: `Deleted ${user.name}...`,
			success: `Successfully deleted ${user.name}`,
			error: (e) => `Delete failed: ${e.message}`
		});
	}

	const limitList = 100;
	$: searchTerm = $page.url.searchParams.get('q') ?? '';
	$: statusFilter = '';
	$: searchTermLower = searchTerm.toLowerCase();
	$: filteredUsers = $storedUsersForAdmin
		.filter(
			(user) =>
				!searchTerm ||
				user.id.toLowerCase() === searchTermLower ||
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

	function handleSearchTermInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const value = target.value;

		const query = $page.url.searchParams;

		if (value) {
			query.set('q', value);
		} else {
			query.delete('q');
		}

		// replaceState: true prevents flooding the browser history with every keystroke
		// keepFocus: true ensures the cursor doesn't jump out of the input
		goto(`?${query.toString()}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});

		searchTerm = value;
	}

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
	<div class="filter-bar">
		<select bind:value={statusFilter} class="search-input">
			<option value="" selected>Status</option>
			{#each Constants['public']['Enums']['user_status'] as status}
				<option value={status}>{status}</option>
			{/each}
		</select>
		<input
			id="searchTerm"
			type="text"
			placeholder="Search for name, nickname or email..."
			value={searchTerm}
			on:input={handleSearchTermInput}
			class="search-input filter-bar-fill-remaining"
		/>
	</div>
	{#if $storedUsersForAdminLoading}
		<LoadingBar />
	{:else}
		<table class="content-table">
			<thead>
				<tr>
					<th>Nickname /<br />Name</th>
					<th>Created At ↓</th>
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
										<div class="control-strip-spacer" />
										<button class="btn-delete" on:click={deleteUser}>Delete</button>
									</div>
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
		{#if searchTerm == '' && $storedUsersForAdmin.length > limitList}
			... list is filtered, use search bar ...
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
